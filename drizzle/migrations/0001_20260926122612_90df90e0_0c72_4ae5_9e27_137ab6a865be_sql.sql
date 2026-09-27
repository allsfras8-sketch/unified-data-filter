
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.has_perm(text, perm_action) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_perm(text, perm_action) TO authenticated;
REVOKE ALL ON FUNCTION public.grant_default_permissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated;

CREATE TYPE public.account_nature AS ENUM ('closing','balance_sheet','profit_loss');

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  nature public.account_nature NOT NULL DEFAULT 'balance_sheet',
  currency public.currency_code NOT NULL DEFAULT 'USD',
  is_group boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rate_date date NOT NULL DEFAULT current_date,
  currency public.currency_code NOT NULL DEFAULT 'SYP',
  rate_to_usd numeric(18,6) NOT NULL CHECK (rate_to_usd > 0),
  UNIQUE (tenant_id, rate_date, currency)
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'customer' CHECK (partner_type IN ('customer','supplier','both')),
  phone text,
  address text,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_no integer NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  description text,
  currency public.currency_code NOT NULL DEFAULT 'USD',
  exchange_rate numeric(18,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  doc_type text NOT NULL DEFAULT 'journal',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entry_no)
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  project_id uuid,
  description text,
  debit numeric(18,4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(18,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX idx_lines_entry ON public.journal_lines(entry_id);
CREATE INDEX idx_lines_account ON public.journal_lines(account_id);

CREATE OR REPLACE FUNCTION public.check_entry_balanced()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eid uuid; d numeric; c numeric;
BEGIN
  eid := COALESCE(NEW.entry_id, OLD.entry_id);
  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE id = eid) THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO d, c
  FROM public.journal_lines WHERE entry_id = eid;
  IF d <> c THEN
    RAISE EXCEPTION 'القيد غير متوازن: مجموع المدين % لا يساوي مجموع الدائن %', d, c;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.check_entry_balanced() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER trg_entry_balanced
AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_entry_balanced();

CREATE OR REPLACE FUNCTION public.next_entry_no(_tenant uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MAX(entry_no),0) + 1 FROM public.journal_entries WHERE tenant_id = _tenant
$$;
REVOKE ALL ON FUNCTION public.next_entry_no(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_entry_no(uuid) TO authenticated;

CREATE TABLE public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  branch text,
  account_no text,
  currency public.currency_code NOT NULL DEFAULT 'USD',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cheque_no text NOT NULL,
  direction text NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming','outgoing')),
  bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  currency public.currency_code NOT NULL DEFAULT 'USD',
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collected','returned','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  purchase_date date NOT NULL DEFAULT current_date,
  cost numeric(18,4) NOT NULL CHECK (cost >= 0),
  salvage_value numeric(18,4) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_years integer NOT NULL DEFAULT 5 CHECK (useful_life_years > 0),
  currency public.currency_code NOT NULL DEFAULT 'USD',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

DO $do$
DECLARE t text; m text; tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounts:accounts','exchange_rates:accounts','partners:partners',
    'journal_entries:journal','journal_lines:journal','banks:cheques',
    'cheques:cheques','fixed_assets:assets'] LOOP
    t := split_part(tbl, ':', 1);
    m := split_part(tbl, ':', 2);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY %1$s_sel ON public.%1$I FOR SELECT TO authenticated
      USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'view')))$f$, t, m);
    EXECUTE format($f$CREATE POLICY %1$s_ins ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'create'))$f$, t, m);
    EXECUTE format($f$CREATE POLICY %1$s_upd ON public.%1$I FOR UPDATE TO authenticated
      USING (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'edit'))
      WITH CHECK (tenant_id = public.current_tenant_id())$f$, t, m);
    EXECUTE format($f$CREATE POLICY %1$s_del ON public.%1$I FOR DELETE TO authenticated
      USING (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'delete'))$f$, t, m);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
  END LOOP;
END
$do$;
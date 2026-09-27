
DROP FUNCTION IF EXISTS public.next_entry_no(uuid);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'قطعة',
  category text,
  reorder_level numeric(18,4) NOT NULL DEFAULT 0,
  default_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  last_purchase_price numeric(18,4) NOT NULL DEFAULT 0,
  avg_cost numeric(18,4) NOT NULL DEFAULT 0,
  qty_on_hand numeric(18,4) NOT NULL DEFAULT 0,
  currency public.currency_code NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  client_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  contract_value numeric(18,4) NOT NULL DEFAULT 0,
  currency public.currency_code NOT NULL DEFAULT 'USD',
  start_date date,
  end_date date,
  completion_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  move_date date NOT NULL DEFAULT current_date,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  unit_cost numeric(18,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moves_product ON public.stock_moves(product_id);

CREATE TABLE IF NOT EXISTS public.boq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  unit text,
  qty numeric(18,4) NOT NULL DEFAULT 0,
  unit_price numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  expense_date date NOT NULL DEFAULT current_date,
  description text NOT NULL,
  amount numeric(18,4) NOT NULL CHECK (amount >= 0),
  currency public.currency_code NOT NULL DEFAULT 'USD',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  due_date date,
  amount numeric(18,4) NOT NULL DEFAULT 0,
  is_done boolean NOT NULL DEFAULT false,
  invoiced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.apply_stock_move()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; new_qty numeric; new_cost numeric; wh_qty numeric;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF NEW.direction = 'in' THEN
    new_qty := p.qty_on_hand + NEW.qty;
    new_cost := CASE WHEN new_qty > 0
      THEN ((GREATEST(p.qty_on_hand,0) * p.avg_cost) + (NEW.qty * NEW.unit_cost)) / new_qty
      ELSE NEW.unit_cost END;
    UPDATE public.products
      SET qty_on_hand = new_qty, avg_cost = round(new_cost, 4), last_purchase_price = NEW.unit_cost
      WHERE id = p.id;
  ELSE
    SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN qty ELSE -qty END), 0) INTO wh_qty
      FROM public.stock_moves WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id AND id <> NEW.id;
    IF wh_qty - NEW.qty < 0 THEN
      RAISE EXCEPTION 'الكمية غير كافية في المستودع: الرصيد المتاح % والمطلوب %', wh_qty, NEW.qty;
    END IF;
    UPDATE public.products SET qty_on_hand = p.qty_on_hand - NEW.qty WHERE id = p.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_stock_move() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_apply_stock_move ON public.stock_moves;
CREATE TRIGGER trg_apply_stock_move AFTER INSERT ON public.stock_moves
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_move();

CREATE OR REPLACE FUNCTION public.revert_stock_move()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products
    SET qty_on_hand = qty_on_hand + CASE WHEN OLD.direction = 'in' THEN -OLD.qty ELSE OLD.qty END
    WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.revert_stock_move() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_revert_stock_move ON public.stock_moves;
CREATE TRIGGER trg_revert_stock_move AFTER DELETE ON public.stock_moves
FOR EACH ROW EXECUTE FUNCTION public.revert_stock_move();

DO $do$
DECLARE t text; m text; tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'warehouses:warehouses','products:products','stock_moves:stock',
    'projects:projects','boq_items:projects','project_expenses:projects','project_milestones:projects'] LOOP
    t := split_part(tbl, ':', 1);
    m := split_part(tbl, ':', 2);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY %1$s_sel ON public.%1$I FOR SELECT TO authenticated
      USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'view')))$f$, t, m);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY %1$s_ins ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'create'))$f$, t, m);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY %1$s_upd ON public.%1$I FOR UPDATE TO authenticated
      USING (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'edit'))
      WITH CHECK (tenant_id = public.current_tenant_id())$f$, t, m);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY %1$s_del ON public.%1$I FOR DELETE TO authenticated
      USING (tenant_id = public.current_tenant_id() AND public.has_perm(%2$L, 'delete'))$f$, t, m);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
  END LOOP;
END
$do$;

DO $g$ BEGIN
  ALTER TABLE public.journal_lines
    ADD CONSTRAINT journal_lines_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $g$;

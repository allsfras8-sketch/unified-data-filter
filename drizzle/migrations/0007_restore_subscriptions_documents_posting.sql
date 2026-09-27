
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS sub_start date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS sub_end date NOT NULL DEFAULT (current_date + 30),
  ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS notes text;
DO $g$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_chk CHECK (plan IN ('trial','monthly','yearly','custom'));
EXCEPTION WHEN duplicate_object THEN NULL; END $g$;

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sh_select ON public.subscription_history;
CREATE POLICY sh_select ON public.subscription_history FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS sh_write ON public.subscription_history;
CREATE POLICY sh_write ON public.subscription_history FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tenant_admin boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET is_tenant_admin = true WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tenant_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = auth.uid() AND p.is_active AND t.is_active AND t.sub_end >= current_date
  )
$$;
REVOKE EXECUTE ON FUNCTION public.tenant_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_perm(_module text, _action perm_action)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR (public.tenant_active() AND EXISTS (
    SELECT 1 FROM public.user_permissions p
    WHERE p.user_id = auth.uid() AND p.module = _module
      AND CASE _action WHEN 'view' THEN p.can_view WHEN 'create' THEN p.can_create
        WHEN 'edit' THEN p.can_edit WHEN 'delete' THEN p.can_delete END))
$$;

CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT false $$;

CREATE OR REPLACE FUNCTION public.grant_default_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text;
BEGIN
  IF NEW.tenant_id IS NULL OR NOT NEW.is_tenant_admin THEN RETURN NEW; END IF;
  FOREACH m IN ARRAY ARRAY['accounts','journal','documents','partners','cheques','assets','products','warehouses','stock','projects','reports','users','audit'] LOOP
    INSERT INTO public.user_permissions (tenant_id, user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (NEW.tenant_id, NEW.id, m, true, true, true, true)
    ON CONFLICT (user_id, module) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;

INSERT INTO public.user_permissions (tenant_id, user_id, module, can_view, can_create, can_edit, can_delete)
SELECT tenant_id, id, 'documents', true, true, true, true FROM public.profiles WHERE tenant_id IS NOT NULL AND is_tenant_admin
ON CONFLICT (user_id, module) DO NOTHING;
INSERT INTO public.tenant_features (tenant_id, module, enabled)
SELECT id, 'documents', true FROM public.tenants ON CONFLICT (tenant_id, module) DO NOTHING;

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('users','edit') AND id <> auth.uid()))
  WITH CHECK (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND is_super_admin = false));

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  cash_account_id uuid REFERENCES public.accounts(id),
  customers_account_id uuid REFERENCES public.accounts(id),
  suppliers_account_id uuid REFERENCES public.accounts(id),
  inventory_account_id uuid REFERENCES public.accounts(id),
  sales_account_id uuid REFERENCES public.accounts(id),
  cogs_account_id uuid REFERENCES public.accounts(id),
  project_cost_account_id uuid REFERENCES public.accounts(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenant_settings TO authenticated;
GRANT ALL ON public.tenant_settings TO service_role;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ts_select ON public.tenant_settings;
CREATE POLICY ts_select ON public.tenant_settings FOR SELECT TO authenticated
  USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.tenant_active()));
DROP POLICY IF EXISTS ts_ins ON public.tenant_settings;
CREATE POLICY ts_ins ON public.tenant_settings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_perm('accounts','edit'));
DROP POLICY IF EXISTS ts_upd ON public.tenant_settings;
CREATE POLICY ts_upd ON public.tenant_settings FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_perm('accounts','edit'))
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  doc_type text NOT NULL CHECK (doc_type IN ('sale','purchase','receipt','payment','transfer','stock_in','stock_out')),
  doc_no integer,
  doc_date date NOT NULL DEFAULT current_date,
  currency currency_code NOT NULL DEFAULT 'USD',
  exchange_rate numeric NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  partner_id uuid REFERENCES public.partners(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  to_warehouse_id uuid REFERENCES public.warehouses(id),
  project_id uuid REFERENCES public.projects(id),
  account_id uuid REFERENCES public.accounts(id),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted')),
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, doc_type, doc_no)
);
CREATE TABLE IF NOT EXISTS public.document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty numeric NOT NULL CHECK (qty > 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents, public.document_lines TO authenticated;
GRANT ALL ON public.documents, public.document_lines TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_sel ON public.documents;
CREATE POLICY documents_sel ON public.documents FOR SELECT TO authenticated USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('documents','view')));
DROP POLICY IF EXISTS documents_ins ON public.documents;
CREATE POLICY documents_ins ON public.documents FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_perm('documents','create'));
DROP POLICY IF EXISTS documents_upd ON public.documents;
CREATE POLICY documents_upd ON public.documents FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_perm('documents','edit')) WITH CHECK (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS documents_del ON public.documents;
CREATE POLICY documents_del ON public.documents FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_perm('documents','delete'));
DROP POLICY IF EXISTS dl_sel ON public.document_lines;
CREATE POLICY dl_sel ON public.document_lines FOR SELECT TO authenticated USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('documents','view')));
DROP POLICY IF EXISTS dl_ins ON public.document_lines;
CREATE POLICY dl_ins ON public.document_lines FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_perm('documents','create'));
DROP POLICY IF EXISTS dl_upd ON public.document_lines;
CREATE POLICY dl_upd ON public.document_lines FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_perm('documents','edit')) WITH CHECK (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS dl_del ON public.document_lines;
CREATE POLICY dl_del ON public.document_lines FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_perm('documents','edit') OR public.has_perm('documents','delete')));

ALTER TABLE public.stock_moves ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.documents_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.doc_no IS NULL THEN
      SELECT COALESCE(MAX(doc_no),0)+1 INTO NEW.doc_no FROM public.documents
       WHERE tenant_id = NEW.tenant_id AND doc_type = NEW.doc_type;
    END IF;
    NEW.status := 'draft'; NEW.journal_entry_id := NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'posted' AND current_setting('app.posting', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'لا يمكن تعديل مستند مرحّل، ألغِ الترحيل أولاً';
    END IF;
    IF NEW.status <> OLD.status AND current_setting('app.posting', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'استخدم زر الترحيل لتغيير حالة المستند';
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.status = 'posted' THEN RAISE EXCEPTION 'لا يمكن حذف مستند مرحّل، ألغِ الترحيل أولاً'; END IF;
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_documents_before ON public.documents;
CREATE TRIGGER trg_documents_before BEFORE INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_before();

CREATE OR REPLACE FUNCTION public.document_lines_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text;
BEGIN
  SELECT status INTO s FROM public.documents WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  IF s = 'posted' THEN RAISE EXCEPTION 'لا يمكن تعديل بنود مستند مرحّل'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_document_lines_guard ON public.document_lines;
CREATE TRIGGER trg_document_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_lines
  FOR EACH ROW EXECUTE FUNCTION public.document_lines_guard();

DROP TRIGGER IF EXISTS trg_audit_documents ON public.documents;
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.audit_row();
DROP TRIGGER IF EXISTS trg_audit_document_lines ON public.document_lines;
CREATE TRIGGER trg_audit_document_lines AFTER INSERT OR UPDATE OR DELETE ON public.document_lines FOR EACH ROW EXECUTE FUNCTION public.audit_row();
DROP TRIGGER IF EXISTS trg_audit_tenants ON public.tenants;
CREATE TRIGGER trg_audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.audit_row();

CREATE OR REPLACE FUNCTION public.post_document(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d record; s record; l record; p record;
  total numeric := 0; cost_usd numeric := 0; cost_doc numeric; rate numeric;
  eid uuid; eno int; wh_cost numeric; lbl text; acc uuid;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _id FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'المستند غير موجود'; END IF;
  IF NOT public.is_super_admin() AND (d.tenant_id <> public.current_tenant_id() OR NOT public.has_perm('documents','edit')) THEN
    RAISE EXCEPTION 'لا تملك صلاحية ترحيل المستندات';
  END IF;
  IF d.status = 'posted' THEN RAISE EXCEPTION 'المستند مرحّل مسبقاً'; END IF;
  SELECT * INTO s FROM public.tenant_settings WHERE tenant_id = d.tenant_id;
  rate := CASE WHEN d.currency = 'USD' THEN 1 ELSE d.exchange_rate END;

  lbl := CASE d.doc_type WHEN 'sale' THEN 'فاتورة مبيع' WHEN 'purchase' THEN 'فاتورة شراء'
    WHEN 'receipt' THEN 'سند قبض' WHEN 'payment' THEN 'سند دفع' WHEN 'transfer' THEN 'مناقلة'
    WHEN 'stock_in' THEN 'إدخال مستودع' ELSE 'إخراج إلى مشروع' END || ' رقم ' || d.doc_no;

  IF d.doc_type IN ('sale','purchase','transfer','stock_in','stock_out') THEN
    IF NOT EXISTS (SELECT 1 FROM public.document_lines WHERE document_id = _id) THEN
      RAISE EXCEPTION 'المستند لا يحتوي على بنود';
    END IF;
    IF d.warehouse_id IS NULL THEN RAISE EXCEPTION 'يجب تحديد المستودع'; END IF;
    SELECT COALESCE(SUM(qty*unit_price),0) INTO total FROM public.document_lines WHERE document_id = _id;
  ELSE
    total := d.amount;
    IF total <= 0 THEN RAISE EXCEPTION 'يجب إدخال المبلغ'; END IF;
  END IF;

  IF d.doc_type IN ('sale','purchase','receipt','payment') AND d.partner_id IS NULL THEN
    RAISE EXCEPTION 'يجب تحديد الزبون أو المورد';
  END IF;
  IF d.doc_type = 'transfer' AND (d.to_warehouse_id IS NULL OR d.to_warehouse_id = d.warehouse_id) THEN
    RAISE EXCEPTION 'يجب تحديد مستودع وجهة مختلف';
  END IF;
  IF d.doc_type = 'stock_out' AND d.project_id IS NULL THEN RAISE EXCEPTION 'يجب تحديد المشروع'; END IF;

  PERFORM set_config('app.posting', 'on', true);

  FOR l IN SELECT * FROM public.document_lines WHERE document_id = _id LOOP
    SELECT * INTO p FROM public.products WHERE id = l.product_id;
    IF d.doc_type IN ('purchase','stock_in') THEN
      INSERT INTO public.stock_moves (tenant_id, product_id, warehouse_id, move_date, direction, qty, unit_cost, project_id, partner_id, reference, document_id)
      VALUES (d.tenant_id, l.product_id, d.warehouse_id, d.doc_date, 'in', l.qty, round(l.unit_price / rate, 4), d.project_id, d.partner_id, lbl, _id);
    ELSIF d.doc_type IN ('sale','stock_out','transfer') THEN
      wh_cost := p.avg_cost;
      INSERT INTO public.stock_moves (tenant_id, product_id, warehouse_id, move_date, direction, qty, unit_cost, project_id, partner_id, reference, document_id)
      VALUES (d.tenant_id, l.product_id, d.warehouse_id, d.doc_date, 'out', l.qty, wh_cost, d.project_id, d.partner_id, lbl, _id);
      cost_usd := cost_usd + l.qty * wh_cost;
      IF d.doc_type = 'transfer' THEN
        INSERT INTO public.stock_moves (tenant_id, product_id, warehouse_id, move_date, direction, qty, unit_cost, project_id, partner_id, reference, document_id)
        VALUES (d.tenant_id, l.product_id, d.to_warehouse_id, d.doc_date, 'in', l.qty, wh_cost, NULL, NULL, lbl, _id);
      END IF;
    END IF;
  END LOOP;

  IF d.doc_type = 'transfer' THEN
    UPDATE public.documents SET status = 'posted' WHERE id = _id;
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(entry_no),0)+1 INTO eno FROM public.journal_entries WHERE tenant_id = d.tenant_id;
  INSERT INTO public.journal_entries (tenant_id, entry_no, entry_date, description, currency, exchange_rate, doc_type, created_by, document_id)
  VALUES (d.tenant_id, eno, d.doc_date, COALESCE(lbl || ' - ' || NULLIF(d.notes,''), lbl), d.currency, rate, d.doc_type, auth.uid(), _id)
  RETURNING id INTO eid;
  cost_doc := round(cost_usd * rate, 2);
  total := round(total, 2);

  IF d.doc_type = 'sale' THEN
    IF s.customers_account_id IS NULL OR s.sales_account_id IS NULL THEN RAISE EXCEPTION 'حدد حسابات الزبائن والمبيعات في إعدادات الحسابات'; END IF;
    INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, partner_id, project_id, description, debit, credit) VALUES
      (d.tenant_id, eid, s.customers_account_id, d.partner_id, d.project_id, lbl, total, 0),
      (d.tenant_id, eid, s.sales_account_id, NULL, d.project_id, lbl, 0, total);
    IF cost_doc > 0 THEN
      IF s.cogs_account_id IS NULL OR s.inventory_account_id IS NULL THEN RAISE EXCEPTION 'حدد حسابي تكلفة المبيعات والمخزون في الإعدادات'; END IF;
      INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, project_id, description, debit, credit) VALUES
        (d.tenant_id, eid, s.cogs_account_id, d.project_id, 'تكلفة ' || lbl, cost_doc, 0),
        (d.tenant_id, eid, s.inventory_account_id, d.project_id, 'تكلفة ' || lbl, 0, cost_doc);
    END IF;
  ELSIF d.doc_type = 'purchase' THEN
    IF s.inventory_account_id IS NULL OR s.suppliers_account_id IS NULL THEN RAISE EXCEPTION 'حدد حسابي المخزون والموردين في الإعدادات'; END IF;
    INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, partner_id, project_id, description, debit, credit) VALUES
      (d.tenant_id, eid, s.inventory_account_id, NULL, d.project_id, lbl, total, 0),
      (d.tenant_id, eid, s.suppliers_account_id, d.partner_id, d.project_id, lbl, 0, total);
  ELSIF d.doc_type IN ('receipt','payment') THEN
    acc := COALESCE(d.account_id, s.cash_account_id);
    IF acc IS NULL THEN RAISE EXCEPTION 'حدد حساب الصندوق أو المصرف'; END IF;
    IF d.doc_type = 'receipt' THEN
      IF s.customers_account_id IS NULL THEN RAISE EXCEPTION 'حدد حساب الزبائن في الإعدادات'; END IF;
      INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, partner_id, project_id, description, debit, credit) VALUES
        (d.tenant_id, eid, acc, NULL, d.project_id, lbl, total, 0),
        (d.tenant_id, eid, s.customers_account_id, d.partner_id, d.project_id, lbl, 0, total);
    ELSE
      IF s.suppliers_account_id IS NULL THEN RAISE EXCEPTION 'حدد حساب الموردين في الإعدادات'; END IF;
      INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, partner_id, project_id, description, debit, credit) VALUES
        (d.tenant_id, eid, s.suppliers_account_id, d.partner_id, d.project_id, lbl, total, 0),
        (d.tenant_id, eid, acc, NULL, d.project_id, lbl, 0, total);
    END IF;
  ELSIF d.doc_type = 'stock_in' THEN
    acc := COALESCE(d.account_id, s.suppliers_account_id);
    IF s.inventory_account_id IS NULL OR acc IS NULL THEN RAISE EXCEPTION 'حدد حساب المخزون والحساب المقابل'; END IF;
    INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, partner_id, project_id, description, debit, credit) VALUES
      (d.tenant_id, eid, s.inventory_account_id, NULL, d.project_id, lbl, total, 0),
      (d.tenant_id, eid, acc, d.partner_id, d.project_id, lbl, 0, total);
  ELSIF d.doc_type = 'stock_out' THEN
    IF s.inventory_account_id IS NULL OR s.project_cost_account_id IS NULL THEN RAISE EXCEPTION 'حدد حسابي المخزون وتكاليف المشاريع في الإعدادات'; END IF;
    IF cost_doc > 0 THEN
      INSERT INTO public.journal_lines (tenant_id, entry_id, account_id, project_id, description, debit, credit) VALUES
        (d.tenant_id, eid, s.project_cost_account_id, d.project_id, lbl, cost_doc, 0),
        (d.tenant_id, eid, s.inventory_account_id, d.project_id, lbl, 0, cost_doc);
    END IF;
  END IF;

  UPDATE public.documents SET status = 'posted', journal_entry_id = eid WHERE id = _id;
  RETURN eid;
END $$;

CREATE OR REPLACE FUNCTION public.unpost_document(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _id FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'المستند غير موجود'; END IF;
  IF NOT public.is_super_admin() AND (d.tenant_id <> public.current_tenant_id() OR NOT public.has_perm('documents','edit')) THEN
    RAISE EXCEPTION 'لا تملك صلاحية إلغاء الترحيل';
  END IF;
  IF d.status <> 'posted' THEN RAISE EXCEPTION 'المستند غير مرحّل'; END IF;
  PERFORM set_config('app.posting', 'on', true);
  DELETE FROM public.stock_moves WHERE document_id = _id;
  DELETE FROM public.journal_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE document_id = _id);
  DELETE FROM public.journal_entries WHERE document_id = _id;
  UPDATE public.documents SET status = 'draft', journal_entry_id = NULL WHERE id = _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.post_document(uuid), public.unpost_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_document(uuid), public.unpost_document(uuid) TO authenticated;

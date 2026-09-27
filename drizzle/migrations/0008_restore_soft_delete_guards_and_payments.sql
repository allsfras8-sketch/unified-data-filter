
REVOKE ALL ON FUNCTION public.documents_before() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.document_lines_guard() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.accounts   ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.products   ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.partners   ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.projects   ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.block_delete_with_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint := 0;
BEGIN
  IF TG_TABLE_NAME = 'accounts' THEN
    SELECT count(*) INTO n FROM public.journal_lines WHERE account_id = OLD.id;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.documents WHERE account_id = OLD.id; END IF;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.accounts WHERE parent_id = OLD.id; END IF;
  ELSIF TG_TABLE_NAME = 'products' THEN
    SELECT count(*) INTO n FROM public.stock_moves WHERE product_id = OLD.id;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.document_lines WHERE product_id = OLD.id; END IF;
  ELSIF TG_TABLE_NAME = 'partners' THEN
    SELECT count(*) INTO n FROM public.journal_lines WHERE partner_id = OLD.id;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.stock_moves WHERE partner_id = OLD.id; END IF;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.documents WHERE partner_id = OLD.id; END IF;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    SELECT count(*) INTO n FROM public.journal_lines WHERE project_id = OLD.id;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.stock_moves WHERE project_id = OLD.id; END IF;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.documents WHERE project_id = OLD.id; END IF;
  ELSIF TG_TABLE_NAME = 'warehouses' THEN
    SELECT count(*) INTO n FROM public.stock_moves WHERE warehouse_id = OLD.id;
    IF n = 0 THEN SELECT count(*) INTO n FROM public.documents WHERE warehouse_id = OLD.id OR to_warehouse_id = OLD.id; END IF;
  END IF;

  IF n > 0 THEN
    RAISE EXCEPTION 'لا يمكن حذف هذه البطاقة لوجود حركات تاريخية مرتبطة بها (%). يمكنك إلغاء تفعيلها بدلاً من الحذف.', n;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.block_delete_with_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_no_delete_accounts ON public.accounts;
CREATE TRIGGER trg_no_delete_accounts   BEFORE DELETE ON public.accounts   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
DROP TRIGGER IF EXISTS trg_no_delete_products ON public.products;
CREATE TRIGGER trg_no_delete_products   BEFORE DELETE ON public.products   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
DROP TRIGGER IF EXISTS trg_no_delete_partners ON public.partners;
CREATE TRIGGER trg_no_delete_partners   BEFORE DELETE ON public.partners   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
DROP TRIGGER IF EXISTS trg_no_delete_projects ON public.projects;
CREATE TRIGGER trg_no_delete_projects   BEFORE DELETE ON public.projects   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
DROP TRIGGER IF EXISTS trg_no_delete_warehouses ON public.warehouses;
CREATE TRIGGER trg_no_delete_warehouses BEFORE DELETE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_fee numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.tenant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pay_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payments TO authenticated;
GRANT ALL ON public.tenant_payments TO service_role;
ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin manages payments" ON public.tenant_payments;
CREATE POLICY "Super admin manages payments" ON public.tenant_payments FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.tenant_id FROM public.profiles p JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.id = auth.uid() AND p.is_active AND t.is_active AND t.sub_end >= current_date
$$;

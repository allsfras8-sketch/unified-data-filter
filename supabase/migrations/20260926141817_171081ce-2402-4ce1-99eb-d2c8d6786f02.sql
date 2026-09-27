
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

CREATE TRIGGER trg_no_delete_accounts   BEFORE DELETE ON public.accounts   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
CREATE TRIGGER trg_no_delete_products   BEFORE DELETE ON public.products   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
CREATE TRIGGER trg_no_delete_partners   BEFORE DELETE ON public.partners   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
CREATE TRIGGER trg_no_delete_projects   BEFORE DELETE ON public.projects   FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();
CREATE TRIGGER trg_no_delete_warehouses BEFORE DELETE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.block_delete_with_history();

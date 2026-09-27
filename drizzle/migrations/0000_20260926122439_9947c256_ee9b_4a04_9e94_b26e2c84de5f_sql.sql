
-- ===== ENUMS =====
CREATE TYPE public.perm_action AS ENUM ('view','create','edit','delete');
CREATE TYPE public.currency_code AS ENUM ('USD','SYP');

-- ===== TENANTS =====
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

CREATE TABLE public.tenant_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_features TO authenticated;
GRANT ALL ON public.tenant_features TO service_role;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT '',
  email text,
  is_super_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  user_id uuid,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;

-- ===== HELPER FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.has_perm(_module text, _action perm_action)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_permissions p
    WHERE p.user_id = auth.uid() AND p.module = _module
      AND CASE _action
        WHEN 'view' THEN p.can_view
        WHEN 'create' THEN p.can_create
        WHEN 'edit' THEN p.can_edit
        WHEN 'delete' THEN p.can_delete
      END
  )
$$;

-- first user to call this becomes the platform owner
CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_super_admin) THEN
    UPDATE public.profiles SET is_super_admin = true WHERE id = auth.uid();
    ok := true;
  END IF;
  RETURN ok;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated;

-- default full permissions for a new company user
CREATE OR REPLACE FUNCTION public.grant_default_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  FOREACH m IN ARRAY ARRAY['accounts','journal','partners','cheques','assets','products','warehouses','stock','projects','reports','users','audit'] LOOP
    INSERT INTO public.user_permissions (tenant_id, user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (NEW.tenant_id, NEW.id, m, true, true, true, true)
    ON CONFLICT (user_id, module) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_profiles_default_perms
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_default_permissions();

-- generic audit trigger
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; t uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  BEGIN t := (r->>'tenant_id')::uuid; EXCEPTION WHEN others THEN t := NULL; END;
  INSERT INTO public.audit_log (tenant_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (t, auth.uid(), TG_TABLE_NAME, r->>'id', TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- ===== RLS =====
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.current_tenant_id());
CREATE POLICY tenants_write ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY tf_select ON public.tenant_features FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY tf_write ON public.tenant_features FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('users','edit')))
  WITH CHECK (id = auth.uid() OR public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY up_select ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY up_write ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('users','edit')))
  WITH CHECK (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('users','edit')));

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin() OR (tenant_id = public.current_tenant_id() AND public.has_perm('audit','view')));

-- ===== DEMO TENANT =====
INSERT INTO public.tenants (id, name, code, phone, address)
VALUES ('11111111-1111-1111-1111-111111111111', 'شركة الأمل للمقاولات', 'AMAL', '011-1234567', 'دمشق - سوريا');
INSERT INTO public.tenant_features (tenant_id, module, enabled)
SELECT '11111111-1111-1111-1111-111111111111', m, true
FROM unnest(ARRAY['accounts','journal','partners','cheques','assets','products','warehouses','stock','projects','reports','users','audit']) AS m;
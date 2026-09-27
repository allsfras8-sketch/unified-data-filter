ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_fee numeric NOT NULL DEFAULT 0;

CREATE TABLE public.tenant_payments (
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
CREATE POLICY "Super admin manages payments" ON public.tenant_payments FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Lock company data once subscription ends or company is disabled
CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.tenant_id FROM public.profiles p JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.id = auth.uid() AND p.is_active AND t.is_active AND t.sub_end >= current_date
$$;
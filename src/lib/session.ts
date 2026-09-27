import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type PermRow = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type Me = {
  userId: string;
  email: string;
  fullName: string;
  tenantId: string | null;
  tenantName: string | null;
  isSuperAdmin: boolean;
  perms: PermRow[];
  features: Record<string, boolean>;
  tenantLocked: boolean;
};

async function loadMe(): Promise<Me | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Accounts are created by the system administrator; there is no self-service
  // profile creation.
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;

  const [permsRes, tenantRes, featRes, activeRes] = await Promise.all([
    db.from("user_permissions").select("module,can_view,can_create,can_edit,can_delete").eq("user_id", user.id),
    profile?.tenant_id
      ? db.from("tenants").select("id,name").eq("id", profile.tenant_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile?.tenant_id
      ? db.from("tenant_features").select("module,enabled").eq("tenant_id", profile.tenant_id)
      : Promise.resolve({ data: [] }),
    db.rpc("tenant_active"),
  ]);

  const features: Record<string, boolean> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (featRes.data ?? []).forEach((f: any) => {
    features[f.module] = f.enabled;
  });

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? "",
    tenantId: profile?.tenant_id ?? null,
    tenantName: tenantRes.data?.name ?? null,
    isSuperAdmin: !!profile?.is_super_admin,
    perms: permsRes.data ?? [],
    features,
    tenantLocked: !profile.is_super_admin && activeRes.data !== true,
  };
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: loadMe, staleTime: 60_000 });
}

export function can(me: Me | null | undefined, module: string, action: "view" | "create" | "edit" | "delete") {
  if (!me) return false;
  if (me.isSuperAdmin) return true;
  if (me.features[module] === false) return false;
  const p = me.perms.find((x) => x.module === module);
  if (!p) return false;
  return action === "view" ? p.can_view : action === "create" ? p.can_create : action === "edit" ? p.can_edit : p.can_delete;
}

export function moduleEnabled(me: Me | null | undefined, module: string) {
  if (!me) return false;
  if (me.isSuperAdmin) return true;
  return me.features[module] !== false && can(me, module, "view");
}

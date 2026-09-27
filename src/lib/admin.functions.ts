import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODULES = [
  "accounts",
  "journal",
  "documents",
  "partners",
  "cheques",
  "assets",
  "products",
  "warehouses",
  "stock",
  "projects",
  "reports",
  "users",
  "audit",
];

type Caller = {
  id: string;
  tenant_id: string | null;
  is_super_admin: boolean;
  is_tenant_admin: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCaller(supabase: any, userId: string): Promise<Caller> {
  const { data } = await supabase
    .from("profiles")
    .select("id,tenant_id,is_super_admin,is_tenant_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("لا يوجد ملف مستخدم لهذا الحساب");
  return data as Caller;
}

function assertPassword(password: string) {
  if (!password || password.length < 6) throw new Error("كلمة المرور يجب ألا تقل عن 6 محارف");
}

/** Creates the very first system owner. Refuses once an owner exists. */
export const bootstrapOwner = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName: string }) => d)
  .handler(async ({ data }) => {
    assertPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_super_admin", true);
    if ((count ?? 0) > 0) throw new Error("تم إنشاء حساب مالك النظام مسبقاً");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user!.id,
      email: data.email,
      full_name: data.fullName,
      tenant_id: null,
      is_super_admin: true,
      is_active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user!.id);
      throw new Error(pErr.message);
    }
    return { ok: true as const };
  });

/** True when no system owner exists yet (drives the bootstrap form). */
export const ownerExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_super_admin", true);
  return { exists: (count ?? 0) > 0 };
});


/** Seeds the chosen accounting framework into a brand-new tenant. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedFramework(supabaseAdmin: any, tenantId: string, framework: string) {
  if (framework === "blank") return;
  const { UNIFIED_COA, SETTINGS_MAP, DEMO_WAREHOUSES, DEMO_PRODUCTS, DEMO_PARTNERS, DEMO_PROJECTS, DEMO_OPENING } =
    await import("@/lib/coa-seed");

  const idByCode: Record<string, string> = {};
  // Insert level by level so parent ids exist first.
  const levels: (typeof UNIFIED_COA)[] = [];
  const remaining = [...UNIFIED_COA];
  let guard = 0;
  while (remaining.length && guard++ < 10) {
    const ready = remaining.filter((a) => !a.parent || levels.flat().some((x) => x.code === a.parent));
    if (!ready.length) break;
    levels.push(ready);
    ready.forEach((r) => remaining.splice(remaining.indexOf(r), 1));
  }
  for (const level of levels) {
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .insert(
        level.map((a) => ({
          tenant_id: tenantId,
          code: a.code,
          name: a.name,
          notes: a.nameEn,
          nature: a.nature,
          is_group: !!a.isGroup,
          parent_id: a.parent ? idByCode[a.parent] : null,
        })),
      )
      .select("id,code");
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((r: any) => (idByCode[r.code] = r.id));
  }

  const settings: Record<string, string | null> = { tenant_id: tenantId };
  Object.entries(SETTINGS_MAP).forEach(([k, code]) => (settings[k] = idByCode[code] ?? null));
  await supabaseAdmin.from("tenant_settings").upsert(settings, { onConflict: "tenant_id" });

  if (framework !== "demo") return;

  const { data: whs } = await supabaseAdmin
    .from("warehouses")
    .insert(DEMO_WAREHOUSES.map((w) => ({ ...w, tenant_id: tenantId })))
    .select("id,code");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainWh = (whs ?? []).find((w: any) => w.code === "WH1")?.id ?? null;

  await supabaseAdmin
    .from("products")
    .insert(DEMO_PRODUCTS.map((p) => ({ ...p, tenant_id: tenantId, default_warehouse_id: mainWh })));

  const { data: partners } = await supabaseAdmin
    .from("partners")
    .insert(
      DEMO_PARTNERS.map((p) => ({
        tenant_id: tenantId,
        code: p.code,
        name: p.name,
        partner_type: p.partner_type,
        account_id: idByCode[p.account] ?? null,
      })),
    )
    .select("id,code");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (partners ?? []).find((p: any) => p.code === "C-001")?.id ?? null;

  await supabaseAdmin
    .from("projects")
    .insert(DEMO_PROJECTS.map((p) => ({ ...p, tenant_id: tenantId, client_id: client })));

  const { data: entry, error: eErr } = await supabaseAdmin
    .from("journal_entries")
    .insert({
      tenant_id: tenantId,
      entry_no: 1,
      entry_date: new Date().toISOString().slice(0, 10),
      description: "قيد الأرصدة الافتتاحية",
      doc_type: "opening",
    })
    .select("id")
    .single();
  if (eErr) throw new Error(eErr.message);
  await supabaseAdmin.from("journal_lines").insert(
    DEMO_OPENING.map((l) => ({
      tenant_id: tenantId,
      entry_id: entry.id,
      account_id: idByCode[l.account],
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    })),
  );
}

/** Owner-only: creates a company plus its admin account in one step. */
export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      name: string;
      code: string;
      plan: string;
      subEnd: string;
      maxUsers: number;
      notes?: string;
      framework: "blank" | "unified" | "demo";
      adminName: string;
      adminEmail: string;
      adminPassword: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase, context.userId);
    if (!caller.is_super_admin) throw new Error("هذه العملية لمالك النظام فقط");
    assertPassword(data.adminPassword);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name,
        code: data.code || null,
        plan: data.plan,
        sub_end: data.subEnd,
        max_users: data.maxUsers,
        notes: data.notes || null,
        is_active: true,
      })
      .select()
      .single();
    if (tErr) throw new Error(tErr.message);

    await supabaseAdmin
      .from("tenant_features")
      .upsert(
        MODULES.map((m) => ({ tenant_id: tenant.id, module: m, enabled: true })),
        { onConflict: "tenant_id,module" },
      );

    const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.adminEmail,
      password: data.adminPassword,
      email_confirm: true,
      user_metadata: { full_name: data.adminName },
    });
    if (uErr) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(uErr.message);
    }

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user!.id,
      email: data.adminEmail,
      full_name: data.adminName,
      tenant_id: tenant.id,
      is_tenant_admin: true,
      is_active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user!.id);
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(pErr.message);
    }

    try {
      await seedFramework(supabaseAdmin, tenant.id, data.framework ?? "blank");
    } catch (e) {
      throw new Error(`تم إنشاء الشركة لكن فشل تهيئة الدليل المحاسبي: ${(e as Error).message}`);
    }

    await supabaseAdmin.from("subscription_history").insert({
      tenant_id: tenant.id,
      plan: data.plan,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: data.subEnd,
      amount: 0,
      notes: "إنشاء الاشتراك",
    });

    return { tenantId: tenant.id as string };
  });

/** Creates a user account directly (no email confirmation, no signup flow). */
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      fullName: string;
      email: string;
      password: string;
      isTenantAdmin: boolean;
      permissions?: {
        module: string;
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase, context.userId);
    let allowed = caller.is_super_admin || (caller.is_tenant_admin && caller.tenant_id === data.tenantId);
    if (!allowed && caller.tenant_id === data.tenantId) {
      const { data: p } = await context.supabase
        .from("user_permissions")
        .select("can_create")
        .eq("user_id", context.userId)
        .eq("module", "users")
        .maybeSingle();
      allowed = !!p?.can_create;
    }
    if (!allowed) throw new Error("لا تملك صلاحية إنشاء المستخدمين");
    if (data.isTenantAdmin && !caller.is_super_admin && !caller.is_tenant_admin) {
      throw new Error("فقط مدير الشركة يمكنه إنشاء مدير آخر");
    }
    assertPassword(data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("max_users")
      .eq("id", data.tenantId)
      .maybeSingle();
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", data.tenantId);
    if (tenant && (count ?? 0) >= tenant.max_users) {
      throw new Error("تم بلوغ الحد الأقصى لعدد المستخدمين في هذه الشركة");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user!.id,
      email: data.email,
      full_name: data.fullName,
      tenant_id: data.tenantId,
      is_tenant_admin: data.isTenantAdmin,
      is_active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user!.id);
      throw new Error(pErr.message);
    }
    const rows = (data.permissions ?? [])
      .filter((p) => MODULES.includes(p.module))
      .map((p) => ({
        tenant_id: data.tenantId,
        user_id: created.user!.id,
        module: p.module,
        can_view: !!p.can_view,
        can_create: !!p.can_create,
        can_edit: !!p.can_edit,
        can_delete: !!p.can_delete,
      }));
    if (rows.length && !data.isTenantAdmin) {
      const { error: permErr } = await supabaseAdmin
        .from("user_permissions")
        .upsert(rows, { onConflict: "user_id,module" });
      if (permErr) throw new Error(permErr.message);
    }
    return { userId: created.user!.id };
  });

/** Sets a new password for a managed user. */
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; password: string }) => d)
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase, context.userId);
    assertPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id,tenant_id,is_super_admin")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("المستخدم غير موجود");
    if (!caller.is_super_admin) {
      if (target.is_super_admin) throw new Error("غير مسموح");
      if (!caller.is_tenant_admin || caller.tenant_id !== target.tenant_id) throw new Error("غير مسموح");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Deletes a user account and its profile. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase, context.userId);
    if (data.userId === caller.id) throw new Error("لا يمكنك حذف حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id,tenant_id,is_super_admin")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("المستخدم غير موجود");
    if (!caller.is_super_admin) {
      if (target.is_super_admin) throw new Error("غير مسموح");
      if (!caller.is_tenant_admin || caller.tenant_id !== target.tenant_id) throw new Error("غير مسموح");
    }
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

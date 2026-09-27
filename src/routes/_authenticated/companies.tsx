import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import { db } from "@/lib/db";
import { useMe } from "@/lib/session";
import { MODULE_LABEL, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, UserPlus, KeyRound, Trash2 } from "lucide-react";
import {
  createCompany,
  createUserAccount,
  setUserPassword,
  deleteUserAccount,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/companies")({ component: CompaniesPage });

const MODULES = Object.keys(MODULE_LABEL);
const PLANS = [
  { value: "trial", label: "تجريبي" },
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
  { value: "custom", label: "مخصص" },
];

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const emptyCompany = {
  name: "",
  code: "",
  plan: "yearly",
  subEnd: inDays(365),
  maxUsers: 5,
  notes: "",
  framework: "unified" as "blank" | "unified" | "demo",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function CompaniesPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCompany);
  const [userDialog, setUserDialog] = useState<{ tenantId: string; name: string } | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    isTenantAdmin: false,
  });

  const createCompanyFn = useServerFn(createCompany);
  const createUserFn = useServerFn(createUserAccount);
  const setPasswordFn = useServerFn(setUserPassword);
  const deleteUserFn = useServerFn(deleteUserAccount);

  const tenants = useQuery({
    queryKey: ["tenants"],
    enabled: !!me?.isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await db.from("tenants").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const features = useQuery({
    queryKey: ["tenant_features_all"],
    enabled: !!me?.isSuperAdmin,
    queryFn: async () => (await db.from("tenant_features").select("*")).data ?? [],
  });

  const profiles = useQuery({
    queryKey: ["all_profiles"],
    enabled: !!me?.isSuperAdmin,
    queryFn: async () => (await db.from("profiles").select("*").order("full_name")).data ?? [],
  });

  const addCompany = useMutation({
    mutationFn: async () => createCompanyFn({ data: form }),
    onSuccess: () => {
      toast.success("تم إنشاء الشركة وحساب مديرها");
      setOpen(false);
      setForm(emptyCompany);
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant_features_all"] });
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addUser = useMutation({
    mutationFn: async () =>
      createUserFn({ data: { tenantId: userDialog!.tenantId, ...userForm } }),
    onSuccess: () => {
      toast.success("تم إنشاء حساب المستخدم");
      setUserDialog(null);
      setUserForm({ fullName: "", email: "", password: "", isTenantAdmin: false });
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async (args: { userId: string; password: string }) => setPasswordFn({ data: args }),
    onSuccess: () => toast.success("تم تغيير كلمة المرور"),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => deleteUserFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("تم حذف الحساب");
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleModule = useMutation({
    mutationFn: async (args: { tenantId: string; module: string; enabled: boolean }) => {
      const { error } = await db
        .from("tenant_features")
        .upsert(
          { tenant_id: args.tenantId, module: args.module, enabled: args.enabled },
          { onConflict: "tenant_id,module" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant_features_all"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTenant = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (args: { id: string; patch: any }) => {
      const { error } = await db.from("tenants").update(args.patch).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me && !me.isSuperAdmin) {
    return <p className="text-muted-foreground">هذه الصفحة مخصصة لمالك النظام فقط.</p>;
  }

  function isOn(tenantId: string, module: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (features.data ?? []).find((f: any) => f.tenant_id === tenantId && f.module === module);
    return row ? !!row.enabled : true;
  }

  function usersOf(tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (profiles.data ?? []).filter((p: any) => p.tenant_id === tenantId);
  }

  return (
    <div>
      <PageHeader
        title="لوحة مدير النظام"
        subtitle="إنشاء حسابات الشركات ومستخدميها مباشرة، وضبط الاشتراك والواجهات المتاحة لكل شركة"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            حساب شركة جديد
          </Button>
        }
      />

      <div className="space-y-5">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(tenants.data ?? []).map((t: any) => {
          const expired = t.sub_end && new Date(t.sub_end) < new Date();
          return (
            <div key={t.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    {t.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">({t.code ?? "—"})</span>
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    الاشتراك: {PLANS.find((p) => p.value === t.plan)?.label ?? t.plan} · ينتهي{" "}
                    {fmtDate(t.sub_end)} {expired ? "· منتهي" : ""} · المستخدمون {usersOf(t.id).length}/
                    {t.max_users}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    مفعّلة
                    <Switch
                      checked={!!t.is_active}
                      onCheckedChange={(v) => updateTenant.mutate({ id: t.id, patch: { is_active: v } })}
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserDialog({ tenantId: t.id, name: t.name })}
                  >
                    <UserPlus className="size-4" />
                    مستخدم جديد
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">الخطة</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={t.plan}
                    onChange={(e) => updateTenant.mutate({ id: t.id, patch: { plan: e.target.value } })}
                  >
                    {PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">نهاية الاشتراك</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    defaultValue={t.sub_end}
                    onBlur={(e) =>
                      e.target.value !== t.sub_end &&
                      updateTenant.mutate({ id: t.id, patch: { sub_end: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">حد المستخدمين</Label>
                  <Input
                    type="number"
                    min={1}
                    className="mt-1"
                    defaultValue={t.max_users}
                    onBlur={(e) =>
                      Number(e.target.value) !== t.max_users &&
                      updateTenant.mutate({ id: t.id, patch: { max_users: Number(e.target.value) } })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">ملاحظات</Label>
                  <Input
                    className="mt-1"
                    defaultValue={t.notes ?? ""}
                    onBlur={(e) =>
                      (e.target.value || null) !== t.notes &&
                      updateTenant.mutate({ id: t.id, patch: { notes: e.target.value || null } })
                    }
                  />
                </div>
              </div>

              <h3 className="mt-5 text-sm font-semibold">حسابات المستخدمين</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="border px-2 py-2 text-right">الاسم</th>
                      <th className="border px-2 py-2 text-right">البريد</th>
                      <th className="border px-2 py-2 text-center">مدير الشركة</th>
                      <th className="border px-2 py-2 text-center">نشط</th>
                      <th className="border px-2 py-2 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersOf(t.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="border px-2 py-3 text-center text-muted-foreground">
                          لا يوجد مستخدمون
                        </td>
                      </tr>
                    )}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {usersOf(t.id).map((u: any) => (
                      <tr key={u.id}>
                        <td className="border px-2 py-2">{u.full_name}</td>
                        <td className="border px-2 py-2" dir="ltr">
                          {u.email}
                        </td>
                        <td className="border px-2 py-2 text-center">{u.is_tenant_admin ? "نعم" : "—"}</td>
                        <td className="border px-2 py-2 text-center">
                          <Switch
                            checked={!!u.is_active}
                            onCheckedChange={async (v) => {
                              const { error } = await db
                                .from("profiles")
                                .update({ is_active: v })
                                .eq("id", u.id);
                              if (error) toast.error(error.message);
                              else qc.invalidateQueries({ queryKey: ["all_profiles"] });
                            }}
                          />
                        </td>
                        <td className="border px-2 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const pwd = window.prompt(`كلمة مرور جديدة لـ ${u.full_name}`);
                                if (pwd) resetPassword.mutate({ userId: u.id, password: pwd });
                              }}
                            >
                              <KeyRound className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`حذف حساب ${u.full_name} نهائياً؟`))
                                  removeUser.mutate(u.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-5 text-sm font-semibold">الواجهات المتاحة</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {MODULES.map((m) => (
                  <div key={m} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{MODULE_LABEL[m]}</span>
                    <Switch
                      checked={isOn(t.id, m)}
                      onCheckedChange={(v) => toggleModule.mutate({ tenantId: t.id, module: m, enabled: v })}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>حساب شركة جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>اسم الشركة</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الرمز</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الخطة</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>نهاية الاشتراك</Label>
              <Input
                type="date"
                value={form.subEnd}
                onChange={(e) => setForm({ ...form, subEnd: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>حد المستخدمين</Label>
              <Input
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>تهيئة النظام المحاسبي *</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.framework}
                onChange={(e) =>
                  setForm({ ...form, framework: e.target.value as "blank" | "unified" | "demo" })
                }
              >
                <option value="blank">نظام فارغ — بدون أي حسابات</option>
                <option value="unified">نظام محاسبي موحد — دليل حسابات قياسي عربي/إنكليزي</option>
                <option value="demo">نظام مع بيانات تجريبية — دليل + مواد ومشاريع وموردين وأرصدة افتتاحية</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {form.framework === "blank"
                  ? "تبدأ الشركة فارغة تماماً وتُدخل حساباتها بنفسها."
                  : form.framework === "unified"
                    ? "يتم إنشاء دليل حسابات هرمي كامل وربط حسابات الترحيل التلقائي."
                    : "دليل حسابات كامل مع مستودعات ومواد وزبائن وموردين ومشاريع وقيد أرصدة افتتاحية."}
              </p>
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="sm:col-span-2 mt-2 border-t pt-3 text-sm font-semibold">حساب مدير الشركة</div>
            <div className="space-y-1">
              <Label>الاسم الكامل</Label>
              <Input
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>البريد الإلكتروني (اسم الدخول)</Label>
              <Input
                dir="ltr"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>كلمة المرور</Label>
              <Input
                dir="ltr"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addCompany.mutate()}
              disabled={
                addCompany.isPending ||
                !form.name ||
                !form.adminName ||
                !form.adminEmail ||
                form.adminPassword.length < 6
              }
            >
              {addCompany.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userDialog} onOpenChange={(v) => !v && setUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مستخدم جديد في {userDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>الاسم الكامل</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>البريد الإلكتروني (اسم الدخول)</Label>
              <Input
                dir="ltr"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>كلمة المرور</Label>
              <Input
                dir="ltr"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={userForm.isTenantAdmin}
                onCheckedChange={(v) => setUserForm({ ...userForm, isTenantAdmin: v })}
              />
              مدير الشركة (صلاحيات كاملة)
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addUser.mutate()}
              disabled={
                addUser.isPending ||
                !userForm.fullName ||
                !userForm.email ||
                userForm.password.length < 6
              }
            >
              {addUser.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

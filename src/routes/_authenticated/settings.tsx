import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { db, scope } from "@/lib/db";
import { can, useMe } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

const FIELDS = [
  { key: "cash_account_id", label: "حساب الصندوق / المصرف" },
  { key: "customers_account_id", label: "حساب الزبائن (الذمم المدينة)" },
  { key: "suppliers_account_id", label: "حساب الموردين (الذمم الدائنة)" },
  { key: "inventory_account_id", label: "حساب المخزون" },
  { key: "sales_account_id", label: "حساب المبيعات" },
  { key: "cogs_account_id", label: "حساب تكلفة المبيعات" },
  { key: "project_cost_account_id", label: "حساب تكاليف المشاريع" },
] as const;

function SettingsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const editable = can(me, "accounts", "edit");
  const [form, setForm] = useState<Record<string, string>>({});

  const accounts = useQuery({
    queryKey: ["accounts_flat", me?.tenantId],
    enabled: !!me?.tenantId,
    queryFn: async () =>
      (await scope(db.from("accounts").select("id,code,name,is_group"), me?.tenantId).order("code")).data ?? [],
  });

  const settings = useQuery({
    queryKey: ["tenant_settings", me?.tenantId],
    enabled: !!me?.tenantId,
    queryFn: async () =>
      (await db.from("tenant_settings").select("*").eq("tenant_id", me!.tenantId).maybeSingle()).data,
  });

  useEffect(() => {
    if (settings.data) {
      const next: Record<string, string> = {};
      FIELDS.forEach((f) => {
        next[f.key] = settings.data[f.key] ?? "";
      });
      setForm(next);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | null> = { tenant_id: me!.tenantId! };
      FIELDS.forEach((f) => {
        payload[f.key] = form[f.key] || null;
      });
      const { error } = await db.from("tenant_settings").upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      qc.invalidateQueries({ queryKey: ["tenant_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="إعدادات الربط المحاسبي"
        subtitle="تحديد الحسابات التي تُرحّل إليها المستندات تلقائياً (فواتير، سندات، حركات مخزون)"
      />

      <div className="max-w-3xl space-y-4 rounded-lg border bg-card p-5">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
            <Label>{f.label}</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              disabled={!editable}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            >
              <option value="">— غير محدد —</option>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(accounts.data ?? [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((a: any) => !a.is_group)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={!editable || save.isPending}>
          {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>
    </div>
  );
}

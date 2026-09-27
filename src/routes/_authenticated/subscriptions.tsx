import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { db } from "@/lib/db";
import { useMe } from "@/lib/session";
import { MODULE_LABEL, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({ meta: [{ title: "الاشتراكات والمقبوضات" }] }),
  component: SubscriptionsPage,
});

const PLAN: Record<string, string> = { trial: "تجريبي", monthly: "شهري", yearly: "سنوي", custom: "مخصص" };
const today = () => new Date().toISOString().slice(0, 10);
const n = (v: number) => Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

function SubscriptionsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [pay, setPay] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ amount: "", pay_date: today(), notes: "" });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const q = useQuery({
    queryKey: ["subs_overview"],
    enabled: !!me?.isSuperAdmin,
    queryFn: async () => {
      const [t, p, f] = await Promise.all([
        db.from("tenants").select("*").order("name"),
        db.from("tenant_payments").select("*").order("pay_date", { ascending: false }),
        db.from("tenant_features").select("*"),
      ]);
      if (t.error) throw t.error;
      return { tenants: t.data ?? [], payments: p.data ?? [], features: f.data ?? [] };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["subs_overview"] });

  const update = useMutation({
    mutationFn: async (a: { id: string; patch: any }) => {
      const { error } = await db.from("tenants").update(a.patch).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحفظ"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPay = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("tenant_payments").insert({
        tenant_id: pay!.id, amount: Number(form.amount), pay_date: form.pay_date, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم تسجيل الدفعة"); setPay(null); setForm({ amount: "", pay_date: today(), notes: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me && !me.isSuperAdmin) return <p className="text-muted-foreground">هذه الصفحة مخصصة لمالك النظام فقط.</p>;

  const data = q.data;
  const paidOf = (id: string) => (data?.payments ?? []).filter((p: any) => p.tenant_id === id).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const modsOf = (id: string) =>
    Object.keys(MODULE_LABEL).filter((m) => {
      const r = (data?.features ?? []).find((f: any) => f.tenant_id === id && f.module === m);
      return r ? r.enabled : true;
    });

  const totals = (data?.tenants ?? []).reduce(
    (a: any, t: any) => { const pd = paidOf(t.id); a.fee += Number(t.subscription_fee); a.paid += pd; return a; },
    { fee: 0, paid: 0 },
  );

  return (
    <div>
      <PageHeader title="الاشتراكات والمقبوضات" subtitle="مدة اشتراك كل شركة وواجهاتها المتاحة والمبالغ المقبوضة والباقية. يُقفل حساب الشركة تلقائياً بعد انتهاء الاشتراك." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="إجمالي قيم الاشتراكات" value={n(totals.fee)} />
        <Stat label="المقبوض" value={n(totals.paid)} />
        <Stat label="الباقي" value={n(totals.fee - totals.paid)} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              {["الشركة", "الخطة", "البداية", "النهاية", "الأيام المتبقية", "الحالة", "قيمة الاشتراك", "المقبوض", "الباقي", "الواجهات", ""].map((h) => (
                <th key={h} className="border-b px-2 py-2 text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.tenants ?? []).map((t: any) => {
              const days = Math.ceil((new Date(t.sub_end).getTime() - new Date(today()).getTime()) / 86400000);
              const locked = !t.is_active || days < 0;
              const paid = paidOf(t.id);
              const mods = modsOf(t.id);
              return (
                <tr key={t.id} className="border-b align-top">
                  <td className="px-2 py-2 font-semibold">{t.name}</td>
                  <td className="px-2 py-2">{PLAN[t.plan] ?? t.plan}</td>
                  <td className="px-2 py-2">{fmtDate(t.sub_start)}</td>
                  <td className="px-2 py-2">
                    <Input type="date" className="h-8 w-36" defaultValue={t.sub_end}
                      onBlur={(e) => e.target.value !== t.sub_end && update.mutate({ id: t.id, patch: { sub_end: e.target.value } })} />
                  </td>
                  <td className="px-2 py-2">{days < 0 ? "—" : days}</td>
                  <td className="px-2 py-2">
                    <span className={locked ? "font-semibold text-destructive" : "font-semibold text-primary"}>{locked ? "مقفل" : "فعّال"}</span>
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" className="h-8 w-28" defaultValue={t.subscription_fee}
                      onBlur={(e) => Number(e.target.value) !== Number(t.subscription_fee) && update.mutate({ id: t.id, patch: { subscription_fee: Number(e.target.value) } })} />
                  </td>
                  <td className="px-2 py-2">{n(paid)}</td>
                  <td className="px-2 py-2 font-semibold">{n(Number(t.subscription_fee) - paid)}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{mods.length}/{Object.keys(MODULE_LABEL).length}</td>
                  <td className="px-2 py-2">
                    <Button size="sm" variant="outline" onClick={() => setPay({ id: t.id, name: t.name })}>تسجيل دفعة</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 mt-6 font-semibold">الدفعات</h3>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>{["التاريخ", "الشركة", "المبلغ", "ملاحظات", ""].map((h) => <th key={h} className="border-b px-2 py-2 text-right">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(data?.payments ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">لا توجد دفعات</td></tr>
            )}
            {(data?.payments ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="px-2 py-2">{fmtDate(p.pay_date)}</td>
                <td className="px-2 py-2">{(data?.tenants ?? []).find((t: any) => t.id === p.tenant_id)?.name}</td>
                <td className="px-2 py-2">{n(p.amount)}</td>
                <td className="px-2 py-2">{p.notes ?? ""}</td>
                <td className="px-2 py-2">
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!window.confirm("حذف الدفعة؟")) return;
                    const { error } = await db.from("tenant_payments").delete().eq("id", p.id);
                    if (error) toast.error(error.message); else refresh();
                  }}>حذف</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!pay} onOpenChange={(v) => !v && setPay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفعة — {pay?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>التاريخ</Label><Input type="date" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button disabled={!Number(form.amount) || addPay.isPending} onClick={() => addPay.mutate()}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

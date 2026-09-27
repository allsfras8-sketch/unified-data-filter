import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, scope } from "@/lib/db";
import { can, useMe } from "@/lib/session";
import { exportCsv, printPage } from "@/lib/export";
import { fmtDate, fmtNum, PROJECT_STATUS_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Download, Printer, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({ component: ProjectDetail });

function Ring({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(Math.max(value, 0), 100) / 100) * c;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="mx-auto">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="16" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 90 90)"
        style={{ transition: "stroke-dashoffset .4s ease" }}
      />
      <text x="90" y="98" textAnchor="middle" className="num" fontSize="30" fontWeight="700" fill="currentColor">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [pct, setPct] = useState(0);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await scope(db.from("projects").select("*, partners(name)"), me?.tenantId).eq("id", projectId).maybeSingle()).data,
  });

  useEffect(() => {
    if (project.data) setPct(Number(project.data.completion_pct ?? 0));
  }, [project.data]);

  const boq = useQuery({
    queryKey: ["boq", projectId],
    queryFn: async () => (await scope(db.from("boq_items").select("*"), me?.tenantId).eq("project_id", projectId)).data ?? [],
  });
  const expenses = useQuery({
    queryKey: ["project_expenses", projectId],
    queryFn: async () => (await scope(db.from("project_expenses").select("*"), me?.tenantId).eq("project_id", projectId)).data ?? [],
  });
  const milestones = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => (await scope(db.from("project_milestones").select("*"), me?.tenantId).eq("project_id", projectId)).data ?? [],
  });

  const savePct = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("projects").update({ completion_pct: pct }).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث نسبة الإنجاز");
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (project.isLoading) return <p className="text-muted-foreground">جارٍ التحميل...</p>;
  if (!project.data) return <p className="text-muted-foreground">المشروع غير موجود</p>;

  const p = project.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budget = (boq.data ?? []).reduce((s: number, b: any) => s + Number(b.qty) * Number(b.unit_price), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = (expenses.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const invoiced = (milestones.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((m: any) => m.invoiced)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((s: number, m: any) => s + Number(m.amount ?? 0), 0);
  const contract = Number(p.contract_value ?? 0);

  const cards = [
    { label: "قيمة العقد", value: contract },
    { label: "الموازنة التقديرية (BOQ)", value: budget },
    { label: "المصاريف الفعلية", value: actual },
    { label: "الإيرادات المفوترة", value: invoiced },
    { label: "الربح المتوقع", value: contract - actual },
    { label: "انحراف الموازنة", value: budget - actual },
  ];

  return (
    <div>
      <div className="no-print mb-4 flex justify-between gap-2">
        <Button asChild variant="outline">
          <Link to="/projects">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv(
                `سجل المشروع - ${p.name}`,
                [
                  { key: "label", label: "البند" },
                  { key: "value", label: "القيمة" },
                ],
                cards.map((c) => ({ label: c.label, value: fmtNum(c.value) })),
              )
            }
          >
            <Download className="size-4" />
            تصدير إلى إكسل
          </Button>
          <Button onClick={printPage}>
            <Printer className="size-4" />
            طباعة سجل المشروع
          </Button>
        </div>
      </div>

      <div className="print-area space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الزبون: {p.partners?.name ?? "—"} · الحالة: {PROJECT_STATUS_LABEL[p.status] ?? p.status} · من{" "}
            {fmtDate(p.start_date)} إلى {fmtDate(p.end_date)}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-center">
            <h2 className="mb-2 font-semibold">نسبة الإنجاز</h2>
            <Ring value={pct} />
            {can(me, "projects", "edit") && (
              <div className="no-print mt-4 space-y-3">
                <Slider value={[pct]} min={0} max={100} step={1} onValueChange={(v) => setPct(v[0] ?? 0)} dir="rtl" />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => setPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                  <Button onClick={() => savePct.mutate()} disabled={savePct.isPending}>
                    <Save className="size-4" />
                    حفظ
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            {cards.map((c) => (
              <div key={c.label} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="num mt-1 text-xl font-bold">{fmtNum(c.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <Section title="جدول الكميات (BOQ)">
          <table className="w-full border text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="border px-2 py-2 text-right">البند</th>
                <th className="border px-2 py-2 text-right">الوحدة</th>
                <th className="border px-2 py-2 text-right">الكمية</th>
                <th className="border px-2 py-2 text-right">سعر الوحدة</th>
                <th className="border px-2 py-2 text-right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(boq.data ?? []).map((b: any) => (
                <tr key={b.id}>
                  <td className="border px-2 py-2">{b.description}</td>
                  <td className="border px-2 py-2">{b.unit}</td>
                  <td className="border px-2 py-2">{fmtNum(b.qty)}</td>
                  <td className="border px-2 py-2">{fmtNum(b.unit_price)}</td>
                  <td className="border px-2 py-2">{fmtNum(Number(b.qty) * Number(b.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="المصاريف الفعلية">
          <table className="w-full border text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="border px-2 py-2 text-right">التاريخ</th>
                <th className="border px-2 py-2 text-right">البيان</th>
                <th className="border px-2 py-2 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(expenses.data ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td className="border px-2 py-2">{fmtDate(e.expense_date)}</td>
                  <td className="border px-2 py-2">{e.description}</td>
                  <td className="border px-2 py-2">{fmtNum(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="مراحل المشروع (مراكز الكلفة)">
          <table className="w-full border text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="border px-2 py-2 text-right">المرحلة</th>
                <th className="border px-2 py-2 text-right">تاريخ الاستحقاق</th>
                <th className="border px-2 py-2 text-right">القيمة</th>
                <th className="border px-2 py-2 text-right">منجزة</th>
                <th className="border px-2 py-2 text-right">مفوترة</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(milestones.data ?? []).map((m: any) => (
                <tr key={m.id}>
                  <td className="border px-2 py-2">{m.name}</td>
                  <td className="border px-2 py-2">{fmtDate(m.due_date)}</td>
                  <td className="border px-2 py-2">{fmtNum(m.amount)}</td>
                  <td className="border px-2 py-2">{m.is_done ? "نعم" : "لا"}</td>
                  <td className="border px-2 py-2">{m.invoiced ? "نعم" : "لا"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

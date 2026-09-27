import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { useMe } from "@/lib/session";
import { exportCsv, printPage } from "@/lib/export";
import { fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

type Row = { code: string; name: string; nature: string; debit: number; credit: number; balance: number };

function useLedger(from: string, to: string) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["ledger", me?.tenantId, from, to],
    enabled: !!me,
    queryFn: async (): Promise<Row[]> => {
      let q = db
        .from("journal_lines")
        .select("debit, credit, accounts(code,name,nature), journal_entries(entry_date,exchange_rate)");
      if (me?.tenantId) q = q.eq("tenant_id", me.tenantId);
      const { data, error } = await q;
      if (error) throw error;
      const map = new Map<string, Row>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).forEach((l: any) => {
        const a = l.accounts;
        if (!a) return;
        const d = String(l.journal_entries?.entry_date ?? "");
        if (d && (d < from || d > to)) return;
        const rate = Number(l.journal_entries?.exchange_rate ?? 1) || 1;
        const key = a.code;
        const row = map.get(key) ?? { code: a.code, name: a.name, nature: a.nature, debit: 0, credit: 0, balance: 0 };
        row.debit += Number(l.debit) / rate;
        row.credit += Number(l.credit) / rate;
        row.balance = row.debit - row.credit;
        map.set(key, row);
      });
      return [...map.values()].sort((x, y) => x.code.localeCompare(y.code));
    },
  });
}

function ReportTable({ title, rows, showBoth }: { title: string; rows: Row[]; showBoth?: boolean }) {
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
  return (
    <div className="print-area rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <div className="no-print flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportCsv(
                title,
                [
                  { key: "code", label: "الرمز" },
                  { key: "name", label: "الحساب" },
                  { key: "debit", label: "مدين" },
                  { key: "credit", label: "دائن" },
                  { key: "balance", label: "الرصيد" },
                ],
                rows.map((r) => ({
                  code: r.code,
                  name: r.name,
                  debit: fmtNum(r.debit),
                  credit: fmtNum(r.credit),
                  balance: fmtNum(r.balance),
                })),
              )
            }
          >
            <Download className="size-4" />
            تصدير إلى إكسل
          </Button>
          <Button size="sm" onClick={printPage}>
            <Printer className="size-4" />
            طباعة
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="border px-2 py-2 text-right">الرمز</th>
              <th className="border px-2 py-2 text-right">الحساب</th>
              {showBoth && <th className="border px-2 py-2 text-right">مدين</th>}
              {showBoth && <th className="border px-2 py-2 text-right">دائن</th>}
              <th className="border px-2 py-2 text-right">الرصيد ($)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showBoth ? 5 : 3} className="border px-2 py-6 text-center text-muted-foreground">
                  لا توجد بيانات
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="border px-2 py-2">{r.code}</td>
                <td className="border px-2 py-2">{r.name}</td>
                {showBoth && <td className="border px-2 py-2">{fmtNum(r.debit)}</td>}
                {showBoth && <td className="border px-2 py-2">{fmtNum(r.credit)}</td>}
                <td className="border px-2 py-2">{fmtNum(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted font-bold">
            <tr>
              <td className="border px-2 py-2 text-left" colSpan={2}>
                الإجمالي
              </td>
              {showBoth && <td className="border px-2 py-2">{fmtNum(totalDebit)}</td>}
              {showBoth && <td className="border px-2 py-2">{fmtNum(totalCredit)}</td>}
              <td className="border px-2 py-2">{fmtNum(totalBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const ledger = useLedger(from, to);
  const rows = ledger.data ?? [];
  const pl = rows.filter((r) => r.nature === "profit_loss");
  const bs = rows.filter((r) => r.nature !== "profit_loss");
  const netResult = pl.reduce((s, r) => s + r.credit - r.debit, 0);

  return (
    <div>
      <PageHeader
        title="التقارير المالية"
        subtitle="تُحتسب جميع الأرصدة لحظياً من قيود اليومية ومعادلة بالدولار الأمريكي حسب سعر صرف كل قيد"
      />
      <div className="no-print mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">من تاريخ</Label>
          <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">إلى تاريخ</Label>
          <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <Tabs defaultValue="tb" dir="rtl">
        <TabsList className="no-print mb-4">
          <TabsTrigger value="tb">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="is">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="bs">الميزانية العمومية</TabsTrigger>
        </TabsList>

        <TabsContent value="tb">
          <ReportTable title="ميزان المراجعة" rows={rows} showBoth />
        </TabsContent>
        <TabsContent value="is">
          <ReportTable title="قائمة الدخل (الأرباح والخسائر)" rows={pl} showBoth />
          <p className="mt-3 rounded-lg border bg-card p-4 font-bold">
            صافي النتيجة: <span className="num">{fmtNum(netResult)}</span> $ ({netResult >= 0 ? "ربح" : "خسارة"})
          </p>
        </TabsContent>
        <TabsContent value="bs">
          <ReportTable title="الميزانية العمومية" rows={bs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

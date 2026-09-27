import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useMe } from "@/lib/session";
import { printPage } from "@/lib/export";
import { fmtDate, fmtNum, CURRENCY_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journal/$entryId")({ component: VoucherPage });

function VoucherPage() {
  const { entryId } = Route.useParams();
  const { data: me } = useMe();

  const entry = useQuery({
    queryKey: ["entry", entryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("journal_entries")
        .select("*, journal_lines(*, accounts(code,name), partners(name), projects(name))")
        .eq("id", entryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (entry.isLoading) return <p className="text-muted-foreground">جارٍ التحميل...</p>;
  if (!entry.data) return <p className="text-muted-foreground">القيد غير موجود</p>;

  const e = entry.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines: any[] = e.journal_lines ?? [];
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <div>
      <div className="no-print mb-4 flex justify-between">
        <Button asChild variant="outline">
          <Link to="/journal">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
        </Button>
        <Button onClick={printPage}>
          <Printer className="size-4" />
          طباعة السند
        </Button>
      </div>

      <div className="print-area mx-auto max-w-3xl rounded-lg border bg-card p-8">
        <div className="mb-6 border-b pb-4 text-center">
          <h1 className="text-xl font-bold">{me?.tenantName ?? "الشركة"}</h1>
          <h2 className="mt-1 text-lg font-semibold">سند قيد يومية</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div>
            <span className="text-muted-foreground">رقم القيد: </span>
            <span className="font-semibold">{e.entry_no}</span>
          </div>
          <div>
            <span className="text-muted-foreground">التاريخ: </span>
            <span className="font-semibold">{fmtDate(e.entry_date)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">العملة: </span>
            <span className="font-semibold">{CURRENCY_LABEL[e.currency]}</span>
          </div>
          <div>
            <span className="text-muted-foreground">سعر الصرف: </span>
            <span className="font-semibold">{fmtNum(e.exchange_rate)}</span>
          </div>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="border px-2 py-2 text-right">الحساب</th>
              <th className="border px-2 py-2 text-right">البيان</th>
              <th className="border px-2 py-2 text-right">الجهة</th>
              <th className="border px-2 py-2 text-right">المشروع</th>
              <th className="border px-2 py-2 text-right">مدين</th>
              <th className="border px-2 py-2 text-right">دائن</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="border px-2 py-2">
                  {l.accounts?.code} - {l.accounts?.name}
                </td>
                <td className="border px-2 py-2">{l.description || "—"}</td>
                <td className="border px-2 py-2">{l.partners?.name ?? "—"}</td>
                <td className="border px-2 py-2">{l.projects?.name ?? "—"}</td>
                <td className="border px-2 py-2">{fmtNum(l.debit)}</td>
                <td className="border px-2 py-2">{fmtNum(l.credit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted font-bold">
            <tr>
              <td className="border px-2 py-2 text-left" colSpan={4}>
                الإجمالي
              </td>
              <td className="border px-2 py-2">{fmtNum(totalDebit)}</td>
              <td className="border px-2 py-2">{fmtNum(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">البيان العام: </span>
          {e.description || "—"}
        </p>

        <div className="mt-12 flex justify-between text-sm">
          <div>المحاسب: ..............</div>
          <div>المدير المالي: ..............</div>
          <div>المدير العام: ..............</div>
        </div>
      </div>
    </div>
  );
}

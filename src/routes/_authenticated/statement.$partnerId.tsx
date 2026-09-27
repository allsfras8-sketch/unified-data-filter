import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, scope } from "@/lib/db";
import { useMe } from "@/lib/session";
import { exportCsv, printPage } from "@/lib/export";
import { fmtDate, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statement/$partnerId")({ component: StatementPage });

function StatementPage() {
  const { partnerId } = Route.useParams();
  const { data: me } = useMe();

  const partner = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: async () => (await scope(db.from("partners").select("*"), me?.tenantId).eq("id", partnerId).maybeSingle()).data,
  });

  const lines = useQuery({
    queryKey: ["partner_lines", partnerId],
    queryFn: async () => {
      const { data, error } = await scope(
        db
          .from("journal_lines")
          .select("*, journal_entries(entry_no, entry_date, description, currency, exchange_rate), accounts(code,name)"),
        me?.tenantId,
      ).eq("partner_id", partnerId);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).sort((a: any, b: any) =>
        String(a.journal_entries?.entry_date).localeCompare(String(b.journal_entries?.entry_date)),
      );
    },
  });

  let running = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (lines.data ?? []).map((l: any) => {
    const rate = Number(l.journal_entries?.exchange_rate ?? 1) || 1;
    const debit = Number(l.debit) / rate;
    const credit = Number(l.credit) / rate;
    running += debit - credit;
    return {
      entry_no: l.journal_entries?.entry_no,
      date: fmtDate(l.journal_entries?.entry_date),
      account: `${l.accounts?.code} - ${l.accounts?.name}`,
      description: l.description || l.journal_entries?.description || "—",
      debit: fmtNum(debit),
      credit: fmtNum(credit),
      balance: fmtNum(running),
    };
  });

  return (
    <div>
      <div className="no-print mb-4 flex justify-between gap-2">
        <Button asChild variant="outline">
          <Link to="/partners">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv(
                `كشف حساب - ${partner.data?.name ?? ""}`,
                [
                  { key: "entry_no", label: "رقم القيد" },
                  { key: "date", label: "التاريخ" },
                  { key: "account", label: "الحساب" },
                  { key: "description", label: "البيان" },
                  { key: "debit", label: "مدين" },
                  { key: "credit", label: "دائن" },
                  { key: "balance", label: "الرصيد" },
                ],
                rows,
              )
            }
          >
            <Download className="size-4" />
            تصدير إلى إكسل
          </Button>
          <Button onClick={printPage}>
            <Printer className="size-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="print-area rounded-lg border bg-card p-6">
        <div className="mb-6 border-b pb-4 text-center">
          <h1 className="text-lg font-bold">{me?.tenantName ?? "الشركة"}</h1>
          <h2 className="mt-1 font-semibold">كشف حساب - {partner.data?.name ?? ""}</h2>
          <p className="text-sm text-muted-foreground">جميع المبالغ معادلة بالدولار الأمريكي ($)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="border px-2 py-2 text-right">رقم القيد</th>
                <th className="border px-2 py-2 text-right">التاريخ</th>
                <th className="border px-2 py-2 text-right">الحساب</th>
                <th className="border px-2 py-2 text-right">البيان</th>
                <th className="border px-2 py-2 text-right">مدين</th>
                <th className="border px-2 py-2 text-right">دائن</th>
                <th className="border px-2 py-2 text-right">الرصيد المتحرك</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="border px-2 py-6 text-center text-muted-foreground">
                    لا توجد حركات
                  </td>
                </tr>
              )}
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="border px-2 py-2">{r.entry_no}</td>
                  <td className="border px-2 py-2">{r.date}</td>
                  <td className="border px-2 py-2">{r.account}</td>
                  <td className="border px-2 py-2">{r.description}</td>
                  <td className="border px-2 py-2">{r.debit}</td>
                  <td className="border px-2 py-2">{r.credit}</td>
                  <td className="border px-2 py-2 font-semibold">{r.balance}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted font-bold">
              <tr>
                <td className="border px-2 py-2 text-left" colSpan={6}>
                  الرصيد النهائي
                </td>
                <td className="border px-2 py-2">{fmtNum(running)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

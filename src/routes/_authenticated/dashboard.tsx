import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, scope } from "@/lib/db";
import { useMe } from "@/lib/session";
import { fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: me } = useMe();

  const stats = useQuery({
    queryKey: ["dashboard", me?.tenantId],
    enabled: !!me,
    queryFn: async () => {
      const [accounts, partners, products, projects, cheques, lines] = await Promise.all([
        scope(db.from("accounts").select("id"), me?.tenantId),
        scope(db.from("partners").select("id"), me?.tenantId),
        scope(db.from("products").select("id, qty_on_hand, avg_cost, reorder_level"), me?.tenantId),
        scope(db.from("projects").select("id, contract_value, completion_pct"), me?.tenantId),
        scope(db.from("cheques").select("id, amount, status, direction"), me?.tenantId),
        scope(db.from("journal_lines").select("debit, credit, accounts(nature), journal_entries(exchange_rate)"), me?.tenantId),
      ]);

      let revenue = 0;
      let expense = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (lines.data ?? []).forEach((l: any) => {
        if (l.accounts?.nature !== "profit_loss") return;
        const rate = Number(l.journal_entries?.exchange_rate ?? 1) || 1;
        revenue += Number(l.credit) / rate;
        expense += Number(l.debit) / rate;
      });

      const stockValue = (products.data ?? []).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: number, p: any) => s + Number(p.qty_on_hand) * Number(p.avg_cost),
        0,
      );
      const lowStock = (products.data ?? []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => Number(p.qty_on_hand) <= Number(p.reorder_level),
      ).length;
      const contracts = (projects.data ?? []).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: number, p: any) => s + Number(p.contract_value ?? 0),
        0,
      );
      const pendingCheques = (cheques.data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.status === "pending")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((s: number, c: any) => s + Number(c.amount), 0);

      return {
        accounts: accounts.data?.length ?? 0,
        partners: partners.data?.length ?? 0,
        products: products.data?.length ?? 0,
        projects: projects.data?.length ?? 0,
        revenue,
        expense,
        profit: revenue - expense,
        stockValue,
        lowStock,
        contracts,
        pendingCheques,
      };
    },
  });

  const s = stats.data;
  const cards: { label: string; value: string }[] = [
    { label: "الإيرادات ($)", value: fmtNum(s?.revenue) },
    { label: "المصاريف ($)", value: fmtNum(s?.expense) },
    { label: "صافي النتيجة ($)", value: fmtNum(s?.profit) },
    { label: "قيمة المخزون ($)", value: fmtNum(s?.stockValue) },
    { label: "إجمالي قيمة العقود ($)", value: fmtNum(s?.contracts) },
    { label: "شيكات قيد التحصيل ($)", value: fmtNum(s?.pendingCheques) },
    { label: "عدد الحسابات", value: String(s?.accounts ?? 0) },
    { label: "عدد الزبائن والموردين", value: String(s?.partners ?? 0) },
    { label: "عدد المواد", value: String(s?.products ?? 0) },
    { label: "عدد المشاريع", value: String(s?.projects ?? 0) },
    { label: "مواد تحت حد الطلب", value: String(s?.lowStock ?? 0) },
  ];

  return (
    <div>
      <PageHeader
        title={`لوحة التحكم - ${me?.tenantName ?? ""}`}
        subtitle="مؤشرات مالية وتشغيلية لحظية معادلة بالدولار الأمريكي"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="num mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

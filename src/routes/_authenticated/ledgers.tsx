import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { exportCsv, printPage } from "@/lib/export";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer } from "lucide-react";

type Search = { tab?: string | undefined; id?: string | undefined };

export const Route = createFileRoute("/_authenticated/ledgers")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: typeof s["tab"] === "string" ? (s["tab"] as string) : undefined,
    id: typeof s["id"] === "string" ? (s["id"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "دفاتر الأستاذ والكشوف | المنظومة المحاسبية" },
      {
        name: "description",
        content: "أستاذ المواد والمستودعات وكشوف الزبائن والموردين وأستاذ الحسابات مع فلترة تاريخية وطباعة وتصدير.",
      },
      { property: "og:title", content: "دفاتر الأستاذ والكشوف" },
      { property: "og:description", content: "كشوف تاريخية قابلة للطباعة والتصدير إلى إكسل." },
    ],
  }),
  component: LedgersPage,
});

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Col = { key: string; label: string; numeric?: boolean };

function LedgerTable({
  title,
  subtitle,
  columns,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  columns: Col[];
  rows: Record<string, string | undefined>[];
  footer?: { label: string; value: string };
}) {
  const { t } = useI18n();
  const { data: me } = useMe();
  return (
    <div className="print-area rounded-lg border bg-card p-6">
      <div className="no-print mb-4 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => exportCsv(title, columns, rows)}>
          <Download className="size-4" />
          {t("تصدير إلى إكسل")}
        </Button>
        <Button size="sm" onClick={printPage}>
          <Printer className="size-4" />
          {t("طباعة")}
        </Button>
      </div>

      <div className="mb-5 border-b pb-4 text-center">
        <h1 className="text-lg font-bold">{me?.tenantName ?? t("المنظومة المحاسبية")}</h1>
        <h2 className="mt-1 font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-secondary">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="border px-2 py-2 text-start">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="border px-2 py-6 text-center text-muted-foreground">
                  {t("لا توجد حركات")}
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className={r["_strong"] ? "bg-muted/60 font-semibold" : ""}>
                {columns.map((c) => (
                  <td key={c.key} className="border px-2 py-2 whitespace-nowrap">
                    {r[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot className="bg-muted font-bold">
              <tr>
                <td className="border px-2 py-2 text-start" colSpan={columns.length - 1}>
                  {footer.label}
                </td>
                <td className="border px-2 py-2">{footer.value}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Filters({
  from,
  to,
  setFrom,
  setTo,
  children,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="no-print mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label className="text-xs">{t("من تاريخ")}</Label>
        <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">{t("إلى تاريخ")}</Label>
        <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {children}
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Shared option lists, always scoped to the active company. */
type Opt = { value: string; label: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useOptions(table: string, labelExpr: (r: any) => string, order = "name") {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["opts", table, me?.tenantId],
    enabled: !!me,
    queryFn: async () => {
      let q = db.from(table).select("*").order(order);
      if (me?.tenantId) q = q.eq("tenant_id", me.tenantId);
      const { data } = await q;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({ value: r.id as string, label: labelExpr(r) }) as Opt);
    },
  });
}

/* ---------------- Stock ledger (product / warehouse) ---------------- */

function useStockMoves(args: { from: string; to: string; productId?: string | undefined; warehouseId?: string | undefined }) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["stock_ledger", me?.tenantId, args],
    enabled: !!me && (!!args.productId || !!args.warehouseId),
    queryFn: async () => {
      let q = db
        .from("stock_moves")
        .select("*, products(name,unit,sku), warehouses(name)")
        .order("move_date")
        .order("created_at");
      if (me?.tenantId) q = q.eq("tenant_id", me.tenantId);
      if (args.productId) q = q.eq("product_id", args.productId);
      if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function StockLedger({ mode, initialId }: { mode: "product" | "warehouse"; initialId?: string | undefined }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(todayStr());
  const [id, setId] = useState(initialId ?? "");

  const products = useOptions("products", (r) => `${r["sku"] ?? ""} - ${r["name"]}`);
  const warehouses = useOptions("warehouses", (r) => String(r["name"]));
  const moves = useStockMoves({
    from,
    to,
    productId: mode === "product" ? id || undefined : undefined,
    warehouseId: mode === "warehouse" ? id || undefined : undefined,
  });

  const all = moves.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opening = all.filter((m: any) => m.move_date < from);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const period = all.filter((m: any) => m.move_date >= from && m.move_date <= to);

  let balance = opening.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: number, m: any) => s + (m.direction === "in" ? Number(m.qty) : -Number(m.qty)),
    0,
  );

  const rows: Record<string, string | undefined>[] = [
    {
      date: fmtDate(from),
      ref: t("رصيد أول المدة"),
      item: "",
      inQty: "",
      outQty: "",
      balance: fmtNum(balance, 4),
      _strong: "1",
    },
  ];

  let totalIn = 0;
  let totalOut = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  period.forEach((m: any) => {
    const qty = Number(m.qty);
    if (m.direction === "in") {
      balance += qty;
      totalIn += qty;
    } else {
      balance -= qty;
      totalOut += qty;
    }
    rows.push({
      date: fmtDate(m.move_date),
      ref: m.reference || "—",
      item: mode === "product" ? (m.warehouses?.name ?? "—") : (m.products?.name ?? "—"),
      inQty: m.direction === "in" ? fmtNum(qty, 4) : "",
      outQty: m.direction === "out" ? fmtNum(qty, 4) : "",
      balance: fmtNum(balance, 4),
    });
  });

  const stockMap = new Map<string, { sku: string; name: string; unit: string; qty: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all.filter((m: any) => m.move_date <= to).forEach((m: any) => {
    const r = stockMap.get(m.product_id) ?? { sku: m.products?.sku ?? "", name: m.products?.name ?? "—", unit: m.products?.unit ?? "", qty: 0 };
    r.qty += m.direction === "in" ? Number(m.qty) : -Number(m.qty);
    stockMap.set(m.product_id, r);
  });
  const contents = [...stockMap.values()]
    .filter((r) => Math.abs(r.qty) > 0.00001)
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((r) => ({ sku: r.sku, name: r.name, unit: r.unit, qty: fmtNum(r.qty, 4) }));

  const columns: Col[] = [
    { key: "date", label: t("التاريخ") },
    { key: "ref", label: t("المرجع") },
    { key: "item", label: mode === "product" ? t("المستودع") : t("المادة") },
    { key: "inQty", label: t("الكمية الواردة") },
    { key: "outQty", label: t("الكمية الصادرة") },
    { key: "balance", label: t("الرصيد المتحرك للكمية") },
  ];

  const label =
    mode === "product"
      ? (products.data ?? []).find((o: Opt) => o.value === id)?.label
      : (warehouses.data ?? []).find((o: Opt) => o.value === id)?.label;

  return (
    <>
      <Filters from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <Picker
          label={mode === "product" ? t("اختر المادة") : t("اختر المستودع")}
          value={id}
          onChange={setId}
          options={(mode === "product" ? products.data : warehouses.data) ?? []}
        />
      </Filters>
      {id ? (
        <LedgerTable
          title={`${mode === "product" ? t("أستاذ المواد") : t("أستاذ المستودع")} — ${label ?? ""}`}
          subtitle={`${t("من تاريخ")} ${fmtDate(from)} ${t("إلى تاريخ")} ${fmtDate(to)}`}
          columns={columns}
          rows={rows}
          footer={{
            label: `${t("الإجمالي")}: ${t("الكمية الواردة")} ${fmtNum(totalIn, 4)} · ${t("الكمية الصادرة")} ${fmtNum(totalOut, 4)} — ${t("رصيد آخر المدة")}`,
            value: fmtNum(balance, 4),
          }}
        />
      ) : (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">
          {mode === "product" ? t("اختر المادة") : t("اختر المستودع")}
        </p>
      )}
      {id && mode === "warehouse" && (
        <div className="mt-6">
          <LedgerTable
            title={`${t("المواد الموجودة في المستودع")} — ${label ?? ""}`}
            subtitle={`${t("الرصيد حتى تاريخ")} ${fmtDate(to)}`}
            columns={[
              { key: "sku", label: t("رمز المادة") },
              { key: "name", label: t("المادة") },
              { key: "unit", label: t("الوحدة") },
              { key: "qty", label: t("الكمية المتوفرة") },
            ]}
            rows={contents}
            footer={{ label: t("عدد المواد"), value: String(contents.length) }}
          />
        </div>
      )}
    </>
  );
}

/* ---------------- Journal-based ledgers (partner / account) ---------------- */

function useJournalLines(args: { partnerId?: string | undefined; accountId?: string | undefined; projectId?: string | undefined }) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["gl_ledger", me?.tenantId, args],
    enabled: !!me && (!!args.partnerId || !!args.accountId || !!args.projectId),
    queryFn: async () => {
      let q = db
        .from("journal_lines")
        .select("*, journal_entries(entry_no,entry_date,description,exchange_rate), accounts(code,name), partners(name)");
      if (me?.tenantId) q = q.eq("tenant_id", me.tenantId);
      if (args.partnerId) q = q.eq("partner_id", args.partnerId);
      if (args.accountId) q = q.eq("account_id", args.accountId);
      if (args.projectId) q = q.eq("project_id", args.projectId);
      const { data, error } = await q;
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).sort((a: any, b: any) =>
        String(a.journal_entries?.entry_date ?? "").localeCompare(String(b.journal_entries?.entry_date ?? "")),
      );
    },
  });
}

function GlLedger({ mode, initialId }: { mode: "partner" | "account" | "project"; initialId?: string | undefined }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(todayStr());
  const [id, setId] = useState(initialId ?? "");

  const partners = useOptions("partners", (r) => String(r["name"]));
  const accounts = useOptions("accounts", (r) => `${r["code"]} - ${r["name"]}`, "code");
  const projects = useOptions("projects", (r) => `${r["name"]} — ${t("نسبة الإنجاز")} ${Number(r["completion_pct"] ?? 0)}%`);
  const lines = useJournalLines({
    projectId: mode === "project" ? id || undefined : undefined,
    partnerId: mode === "partner" ? id || undefined : undefined,
    accountId: mode === "account" ? id || undefined : undefined,
  });

  const all = lines.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usd = (l: any, v: unknown) => Number(v ?? 0) / (Number(l.journal_entries?.exchange_rate ?? 1) || 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dateOf = (l: any) => String(l.journal_entries?.entry_date ?? "");

  let balance = all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => dateOf(l) < from)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((s: number, l: any) => s + usd(l, l.debit) - usd(l, l.credit), 0);

  const rows: Record<string, string | undefined>[] = [
    {
      entry: "",
      date: fmtDate(from),
      description: t("رصيد أول المدة"),
      other: "",
      debit: "",
      credit: "",
      balance: fmtNum(balance),
      _strong: "1",
    },
  ];

  let totalDebit = 0;
  let totalCredit = 0;
  all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => dateOf(l) >= from && dateOf(l) <= to)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .forEach((l: any) => {
      const d = usd(l, l.debit);
      const c = usd(l, l.credit);
      balance += d - c;
      totalDebit += d;
      totalCredit += c;
      rows.push({
        entry: String(l.journal_entries?.entry_no ?? ""),
        date: fmtDate(dateOf(l)),
        description: l.description || l.journal_entries?.description || "—",
        other: mode !== "account" ? `${l.accounts?.code ?? ""} - ${l.accounts?.name ?? ""}` : (l.partners?.name ?? "—"),
        debit: fmtNum(d),
        credit: fmtNum(c),
        balance: fmtNum(balance),
      });
    });

  const columns: Col[] = [
    { key: "entry", label: t("رقم القيد") },
    { key: "date", label: t("التاريخ") },
    { key: "description", label: t("البيان") },
    { key: "other", label: mode !== "account" ? t("الحساب") : t("الجهة") },
    { key: "debit", label: t("مدين") },
    { key: "credit", label: t("دائن") },
    { key: "balance", label: t("الرصيد المتحرك") },
  ];

  const optList = (mode === "partner" ? partners.data : mode === "project" ? projects.data : accounts.data) ?? [];
  const label = optList.find((o: Opt) => o.value === id)?.label;
  const pickLabel = mode === "partner" ? t("اختر الجهة") : mode === "project" ? t("اختر المشروع") : t("اختر الحساب");
  const titleLabel = mode === "partner" ? t("كشف حساب") : mode === "project" ? t("كشف حساب مشروع") : t("أستاذ حساب");

  return (
    <>
      <Filters from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <Picker
          label={pickLabel}
          value={id}
          onChange={setId}
          options={optList}
        />
      </Filters>
      {id ? (
        <LedgerTable
          title={`${titleLabel} — ${label ?? ""}`}
          subtitle={`${t("من تاريخ")} ${fmtDate(from)} ${t("إلى تاريخ")} ${fmtDate(to)} · ${t("جميع المبالغ معادلة بالدولار الأمريكي ($)")}`}
          columns={columns}
          rows={rows}
          footer={{
            label: `${t("الإجمالي")}: ${t("مدين")} ${fmtNum(totalDebit)} · ${t("دائن")} ${fmtNum(totalCredit)} — ${t("رصيد آخر المدة")}`,
            value: fmtNum(balance),
          }}
        />
      ) : (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">
          {pickLabel}
        </p>
      )}
    </>
  );
}

function LedgersPage() {
  const { t, dir } = useI18n();
  const search = Route.useSearch();
  const tab = search.tab ?? "product";

  return (
    <div>
      <PageHeader
        title={t("دفاتر الأستاذ التاريخية")}
        subtitle={t("اختر الفترة الزمنية ثم اعرض الكشف، ويمكن طباعته أو تصديره إلى إكسل")}
      />
      <Tabs defaultValue={tab} dir={dir}>
        <TabsList className="no-print mb-4 flex-wrap">
          <TabsTrigger value="product">{t("أستاذ المواد")}</TabsTrigger>
          <TabsTrigger value="warehouse">{t("أستاذ المستودع")}</TabsTrigger>
          <TabsTrigger value="partner">{t("كشوف الزبائن والموردين")}</TabsTrigger>
          <TabsTrigger value="project">{t("كشف حساب مشروع")}</TabsTrigger>
          <TabsTrigger value="account">{t("أستاذ حساب")}</TabsTrigger>
        </TabsList>
        <TabsContent value="product">
          <StockLedger mode="product" initialId={tab === "product" ? search.id : undefined} />
        </TabsContent>
        <TabsContent value="warehouse">
          <StockLedger mode="warehouse" initialId={tab === "warehouse" ? search.id : undefined} />
        </TabsContent>
        <TabsContent value="partner">
          <GlLedger mode="partner" initialId={tab === "partner" ? search.id : undefined} />
        </TabsContent>
        <TabsContent value="project">
          <GlLedger mode="project" initialId={tab === "project" ? search.id : undefined} />
        </TabsContent>
        <TabsContent value="account">
          <GlLedger mode="account" initialId={tab === "account" ? search.id : undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

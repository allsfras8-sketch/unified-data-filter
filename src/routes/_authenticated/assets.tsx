import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { fmtNum, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/assets")({ component: AssetsPage });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function annualDepreciation(row: any) {
  const cost = Number(row.cost ?? 0);
  const salvage = Number(row.salvage_value ?? 0);
  const life = Number(row.useful_life_years ?? 1);
  return (cost - salvage) / (life || 1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function accumulated(row: any) {
  const years = (Date.now() - new Date(row.purchase_date).getTime()) / (365.25 * 24 * 3600 * 1000);
  const value = Math.min(annualDepreciation(row) * Math.max(years, 0), Number(row.cost) - Number(row.salvage_value));
  return Math.max(value, 0);
}


function AssetsPage() {
  return (
    <CrudPage
      table="fixed_assets"
      module="assets"
      title="بطاقة الأصول الثابتة"
      subtitle="الاهتلاك السنوي والمجمّع يُحتسب آلياً بطريقة القسط الثابت"
      orderBy="name"
      ascending
      fields={[
        { key: "code", label: "الرمز" },
        { key: "name", label: "اسم الأصل", required: true },
        { key: "purchase_date", label: "تاريخ الشراء", type: "date", required: true, defaultValue: today() },
        { key: "cost", label: "الكلفة", type: "number", required: true },
        { key: "salvage_value", label: "القيمة التخريدية", type: "number", defaultValue: 0 },
        { key: "useful_life_years", label: "العمر الإنتاجي (سنوات)", type: "number", defaultValue: 5, digits: 0 },
        {
          key: "currency",
          label: "العملة",
          type: "select",
          defaultValue: "USD",
          options: [
            { value: "USD", label: "دولار ($)" },
            { value: "SYP", label: "ليرة سورية (ل.س)" },
          ],
        },
        { key: "account_id", label: "الحساب المحاسبي", type: "ref", refTable: "accounts" },
        {
          key: "annual_dep",
          label: "الاهتلاك السنوي",
          hideInForm: true,
          render: (r) => fmtNum(annualDepreciation(r)),
        },
        {
          key: "acc_dep",
          label: "الاهتلاك المجمّع",
          hideInForm: true,
          render: (r) => fmtNum(accumulated(r)),
        },
        {
          key: "net_value",
          label: "القيمة الدفترية",
          hideInForm: true,
          render: (r) => fmtNum(Number(r.cost) - accumulated(r)),
        },
        { key: "notes", label: "ملاحظات", type: "textarea", hideInTable: true },
      ]}
    />
  );
}

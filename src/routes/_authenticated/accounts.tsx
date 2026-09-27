import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

export const Route = createFileRoute("/_authenticated/accounts")({ component: AccountsPage });

function AccountsPage() {
  return (
    <CrudPage
      table="accounts"
      module="accounts"
      title="بطاقة حساب - شجرة الحسابات"
      subtitle="رمز حساب فريد، حساب أب، نوع الحساب، وعملة الحساب. البطاقات التي لها قيود محاسبية لا تُحذف، بل تُجمّد بإلغاء التفعيل"
      orderBy="code"
      ascending
      importColumns={[
        { key: "code", label: "رمز الحساب", required: true, example: "1101" },
        { key: "name", label: "اسم الحساب", required: true, example: "الصندوق" },
        { key: "parent_code", label: "رمز الحساب الأب", example: "1100" },
        {
          key: "nature",
          label: "نوع الحساب",
          required: true,
          example: "ميزانية",
          map: { ختامي: "closing", ميزانية: "balance_sheet", "أرباح وخسائر": "profit_loss" },
        },
        {
          key: "currency",
          label: "العملة",
          required: true,
          example: "USD",
          map: { "دولار أمريكي": "USD", "ليرة سورية": "SYP" },
        },
        { key: "is_group", label: "حساب تجميعي", type: "boolean", example: "لا" },
        { key: "notes", label: "ملاحظات", example: "" },
      ]}
      importLookups={[{ key: "parent_code", target: "parent_id", table: "accounts", matchOn: ["code", "name"] }]}
      fields={[
        { key: "code", label: "رمز الحساب", required: true },
        { key: "name", label: "اسم الحساب", required: true },
        { key: "parent_id", label: "الحساب الأب", type: "ref", refTable: "accounts" },
        {
          key: "nature",
          label: "نوع الحساب",
          type: "select",
          required: true,
          defaultValue: "balance_sheet",
          options: [
            { value: "closing", label: "ختامي" },
            { value: "balance_sheet", label: "ميزانية" },
            { value: "profit_loss", label: "أرباح وخسائر" },
          ],
        },
        {
          key: "currency",
          label: "العملة",
          type: "select",
          required: true,
          defaultValue: "USD",
          options: [
            { value: "USD", label: "دولار أمريكي ($)" },
            { value: "SYP", label: "ليرة سورية (ل.س)" },
          ],
        },
        { key: "is_group", label: "حساب تجميعي", type: "checkbox" },
        { key: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
        { key: "notes", label: "ملاحظات", type: "textarea", hideInTable: true },
      ]}
    />
  );
}

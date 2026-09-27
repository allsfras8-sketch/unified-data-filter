import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { today } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cheques")({ component: ChequesPage });

function ChequesPage() {
  return (
    <Tabs defaultValue="cheques" dir="rtl">
      <TabsList className="no-print mb-4">
        <TabsTrigger value="cheques">الشيكات</TabsTrigger>
        <TabsTrigger value="banks">البنوك</TabsTrigger>
      </TabsList>

      <TabsContent value="cheques">
        <CrudPage
          table="cheques"
          module="cheques"
          title="إدارة الشيكات"
          subtitle="شيكات واردة برسم التحصيل وشيكات صادرة مع تواريخ الاستحقاق والحالة"
          orderBy="due_date"
          ascending
          fields={[
            { key: "cheque_no", label: "رقم الشيك", required: true },
            {
              key: "direction",
              label: "الاتجاه",
              type: "select",
              required: true,
              defaultValue: "incoming",
              options: [
                { value: "incoming", label: "وارد (برسم التحصيل)" },
                { value: "outgoing", label: "صادر (مدفوع)" },
              ],
            },
            { key: "bank_id", label: "البنك", type: "ref", refTable: "banks" },
            { key: "partner_id", label: "الجهة", type: "ref", refTable: "partners" },
            { key: "amount", label: "المبلغ", type: "number", required: true },
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
            { key: "issue_date", label: "تاريخ الإصدار", type: "date", defaultValue: today() },
            { key: "due_date", label: "تاريخ الاستحقاق", type: "date", required: true, defaultValue: today() },
            {
              key: "status",
              label: "الحالة",
              type: "select",
              defaultValue: "pending",
              options: [
                { value: "pending", label: "قيد التحصيل" },
                { value: "collected", label: "محصّل" },
                { value: "returned", label: "مرتجع" },
                { value: "cancelled", label: "ملغى" },
              ],
            },
            { key: "notes", label: "ملاحظات", type: "textarea", hideInTable: true },
          ]}
        />
      </TabsContent>

      <TabsContent value="banks">
        <CrudPage
          table="banks"
          module="cheques"
          title="البنوك والحسابات المصرفية"
          orderBy="name"
          ascending
          fields={[
            { key: "name", label: "اسم البنك", required: true },
            { key: "branch", label: "الفرع" },
            { key: "account_no", label: "رقم الحساب" },
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
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}

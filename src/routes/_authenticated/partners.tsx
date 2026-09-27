import { createFileRoute, Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partners")({ component: PartnersPage });

function PartnersPage() {
  return (
    <CrudPage
      table="partners"
      module="partners"
      title="بطاقات الزبائن والموردين"
      subtitle="اضغط على أيقونة الكشف لعرض كشف حساب مفصّل مع الرصيد المتحرك. البطاقات ذات القيود لا تُحذف بل تُجمّد"
      orderBy="name"
      ascending
      facetKeys={["partner_type", "account_id"]}
      extraRowAction={(row) => (
        <Button asChild size="icon" variant="ghost" title="كشف حساب">
          <Link to="/statement/$partnerId" params={{ partnerId: row.id }}>
            <FileText className="size-4" />
          </Link>
        </Button>
      )}
      importColumns={[
        { key: "code", label: "الرمز", example: "C-001" },
        { key: "name", label: "الاسم", required: true, example: "شركة النور" },
        {
          key: "partner_type",
          label: "النوع",
          required: true,
          example: "زبون",
          map: { زبون: "customer", مورد: "supplier", "زبون ومورد": "both" },
        },
        { key: "phone", label: "الهاتف", example: "0900000000" },
        { key: "address", label: "العنوان", example: "دمشق" },
        { key: "account_code", label: "رمز الحساب المرتبط", example: "1201" },
      ]}
      importLookups={[{ key: "account_code", target: "account_id", table: "accounts", matchOn: ["code", "name"] }]}
      fields={[
        { key: "code", label: "الرمز" },
        { key: "name", label: "الاسم", required: true },
        {
          key: "partner_type",
          label: "النوع",
          type: "select",
          required: true,
          defaultValue: "customer",
          options: [
            { value: "customer", label: "زبون" },
            { value: "supplier", label: "مورد" },
            { value: "both", label: "زبون ومورد" },
          ],
        },
        { key: "phone", label: "الهاتف" },
        { key: "address", label: "العنوان" },
        { key: "account_id", label: "الحساب المرتبط", type: "ref", refTable: "accounts" },
        { key: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}

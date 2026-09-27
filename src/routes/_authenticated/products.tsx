import { createFileRoute, Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

function ProductsPage() {
  return (
    <CrudPage
      table="products"
      module="products"
      title="بطاقة مادة"
      subtitle="التكلفة الوسطية المرجّحة وآخر سعر شراء تُحتسب آلياً من حركات المخزون. البطاقات ذات الحركات لا تُحذف بل تُجمّد"
      orderBy="name"
      ascending
      extraRowAction={(row) => (
        <Button asChild size="icon" variant="ghost" title="أستاذ المادة">
          <Link to="/ledgers" search={{ tab: "product", id: row.id }}>
            <ScrollText className="size-4" />
          </Link>
        </Button>
      )}
      importColumns={[
        { key: "sku", label: "رمز المادة", required: true, example: "P-001" },
        { key: "barcode", label: "الباركود", example: "" },
        { key: "name", label: "اسم المادة", required: true, example: "إسمنت" },
        { key: "unit", label: "الوحدة", required: true, example: "طن" },
        { key: "category", label: "التصنيف", example: "مواد بناء" },
        { key: "warehouse_name", label: "المستودع", example: "المستودع الرئيسي" },
        { key: "reorder_level", label: "حد إعادة الطلب", type: "number", example: "0" },
      ]}
      importLookups={[
        { key: "warehouse_name", target: "default_warehouse_id", table: "warehouses", matchOn: ["name", "code"] },
      ]}
      fields={[
        { key: "sku", label: "رمز المادة", required: true },
        { key: "barcode", label: "الباركود" },
        { key: "name", label: "اسم المادة", required: true },
        { key: "unit", label: "الوحدة", defaultValue: "قطعة", required: true },
        { key: "category", label: "التصنيف" },
        { key: "default_warehouse_id", label: "المستودع", type: "ref", refTable: "warehouses" },
        { key: "reorder_level", label: "حد إعادة الطلب", type: "number", defaultValue: 0 },
        { key: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
        {
          key: "qty_on_hand",
          label: "الرصيد الحالي",
          type: "number",
          hideInForm: true,
          render: (r) => fmtNum(r.qty_on_hand),
        },
        {
          key: "avg_cost",
          label: "التكلفة الوسطية",
          type: "number",
          hideInForm: true,
          digits: 4,
        },
        {
          key: "last_purchase_price",
          label: "آخر سعر شراء",
          type: "number",
          hideInForm: true,
          digits: 4,
        },
      ]}
    />
  );
}

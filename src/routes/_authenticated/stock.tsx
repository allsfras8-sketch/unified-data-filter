import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/stock")({ component: StockPage });

function StockPage() {
  return (
    <CrudPage
      table="stock_moves"
      module="stock"
      title="حركات المخزون"
      subtitle="النظام يمنع أي إخراج يؤدي إلى مخزون سالب"
      orderBy="move_date"
      dateKey="move_date"
      facetKeys={["direction", "warehouse_id", "product_id", "project_id", "partner_id"]}
      fields={[
        { key: "move_date", label: "التاريخ", type: "date", required: true, defaultValue: today() },
        { key: "product_id", label: "المادة", type: "ref", refTable: "products", required: true },
        { key: "warehouse_id", label: "المستودع", type: "ref", refTable: "warehouses", required: true },
        {
          key: "direction",
          label: "نوع الحركة",
          type: "select",
          required: true,
          defaultValue: "in",
          options: [
            { value: "in", label: "إدخال" },
            { value: "out", label: "إخراج" },
          ],
        },
        { key: "qty", label: "الكمية", type: "number", required: true, digits: 4 },
        { key: "unit_cost", label: "سعر الوحدة", type: "number", defaultValue: 0, digits: 4 },
        { key: "project_id", label: "المشروع", type: "ref", refTable: "projects" },
        { key: "partner_id", label: "الجهة", type: "ref", refTable: "partners" },
        { key: "reference", label: "المرجع" },
      ]}
    />
  );
}

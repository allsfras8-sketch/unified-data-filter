import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

export const Route = createFileRoute("/_authenticated/warehouses")({ component: WarehousesPage });

function WarehousesPage() {
  return (
    <CrudPage
      table="warehouses"
      module="warehouses"
      title="المستودعات"
      subtitle="تعريف المستودعات ومواقعها. المستودعات ذات الحركات لا تُحذف بل تُجمّد"
      orderBy="name"
      ascending
      fields={[
        { key: "code", label: "الرمز" },
        { key: "name", label: "اسم المستودع", required: true },
        { key: "location", label: "الموقع" },
        { key: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}

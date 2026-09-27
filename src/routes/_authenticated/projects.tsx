import { createFileRoute, Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({ component: ProjectsPage });

function ProjectsPage() {
  return (
    <CrudPage
      table="projects"
      module="projects"
      title="بطاقات المشاريع"
      subtitle="اضغط على أيقونة التحليل لعرض نسبة الإنجاز ومقارنة الموازنة بالمصاريف والإيرادات. المشاريع ذات الحركات لا تُحذف بل تُجمّد"
      orderBy="name"
      ascending
      dateKey="start_date"
      facetKeys={["status", "currency", "client_id"]}
      extraRowAction={(row) => (
        <Button asChild size="icon" variant="ghost" title="تفاصيل المشروع">
          <Link to="/projects/$projectId" params={{ projectId: row.id }}>
            <BarChart3 className="size-4" />
          </Link>
        </Button>
      )}
      fields={[
        { key: "code", label: "رمز المشروع" },
        { key: "name", label: "اسم المشروع", required: true },
        { key: "client_id", label: "الزبون", type: "ref", refTable: "partners" },
        { key: "contract_value", label: "قيمة العقد", type: "number", defaultValue: 0 },
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
        { key: "start_date", label: "تاريخ البدء", type: "date" },
        { key: "end_date", label: "تاريخ الانتهاء", type: "date" },
        { key: "completion_pct", label: "نسبة الإنجاز %", type: "number", defaultValue: 0, digits: 0 },
        {
          key: "status",
          label: "الحالة",
          type: "select",
          defaultValue: "active",
          options: [
            { value: "active", label: "قيد التنفيذ" },
            { value: "on_hold", label: "متوقف" },
            { value: "closed", label: "مغلق" },
          ],
        },
        { key: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
        { key: "notes", label: "ملاحظات", type: "textarea", hideInTable: true },
      ]}
    />
  );
}

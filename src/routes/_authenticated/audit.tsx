import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, scope } from "@/lib/db";
import { useMe } from "@/lib/session";
import { exportCsv, printPage } from "@/lib/export";
import { AUDIT_ACTION_LABEL, fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({ component: AuditPage });

function AuditPage() {
  const { data: me } = useMe();
  const [search, setSearch] = useState("");

  const logs = useQuery({
    queryKey: ["audit_log", me?.tenantId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("audit_log").select("*"), me?.tenantId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useQuery({
    queryKey: ["audit_users", me?.tenantId],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await scope(db.from("profiles").select("id, full_name, email"), me?.tenantId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Map<string, string>((data ?? []).map((u: any) => [u.id, u.full_name || u.email]));
    },
  });
  const userName = (id?: string | null) => (id ? (users.data?.get(id) ?? id) : "—");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (logs.data ?? []).filter((r: any) =>
    search ? JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div>
      <PageHeader
        title="سجل الحركات (Audit Trail)"
        subtitle="يسجّل النظام آلياً كل إضافة وتعديل وحذف مع المستخدم والوقت"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                exportCsv(
                  "سجل الحركات",
                  [
                    { key: "created_at", label: "الوقت" },
                    { key: "table_name", label: "الجدول" },
                    { key: "action", label: "العملية" },
                    { key: "record_id", label: "رقم السجل" },
                    { key: "user_id", label: "المستخدم" },
                  ],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  rows.map((r: any) => ({
                    created_at: fmtDateTime(r.created_at),
                    table_name: r.table_name,
                    action: AUDIT_ACTION_LABEL[r.action] ?? r.action,
                    record_id: r.record_id,
                    user_id: userName(r.user_id),
                  })),
                )
              }
            >
              <Download className="size-4" />
              تصدير إلى إكسل
            </Button>
            <Button variant="outline" onClick={printPage}>
              <Printer className="size-4" />
              طباعة
            </Button>
          </>
        }
      />

      <div className="no-print mb-3 max-w-xs">
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="print-area overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-right">الوقت</th>
              <th className="px-3 py-2 text-right">الجدول</th>
              <th className="px-3 py-2 text-right">العملية</th>
              <th className="px-3 py-2 text-right">رقم السجل</th>
              <th className="px-3 py-2 text-right">المستخدم</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  لا توجد حركات مسجّلة
                </td>
              </tr>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{fmtDateTime(r.created_at)}</td>
                <td className="px-3 py-2">{r.table_name}</td>
                <td className="px-3 py-2">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</td>
                <td className="px-3 py-2 text-xs">{r.record_id}</td>
                <td className="px-3 py-2 text-xs">{userName(r.user_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, scope } from "@/lib/db";
import { can, useMe } from "@/lib/session";
import { MODULE_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { NewUserDialog } from "@/components/NewUserDialog";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

const MODULES = Object.keys(MODULE_LABEL);
const ACTIONS = [
  { key: "can_view", label: "استعراض" },
  { key: "can_create", label: "إضافة" },
  { key: "can_edit", label: "تعديل" },
  { key: "can_delete", label: "حذف" },
] as const;

function UsersPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const editable = can(me, "users", "edit");

  const users = useQuery({
    queryKey: ["profiles", me?.tenantId],
    enabled: !!me,
    queryFn: async () => (await scope(db.from("profiles").select("*"), me?.tenantId).order("full_name")).data ?? [],
  });

  const perms = useQuery({
    queryKey: ["all_perms", me?.tenantId],
    enabled: !!me,
    queryFn: async () => (await scope(db.from("user_permissions").select("*"), me?.tenantId)).data ?? [],
  });

  const setPerm = useMutation({
    mutationFn: async (args: { userId: string; module: string; field: string; value: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = (perms.data ?? []).find((p: any) => p.user_id === args.userId && p.module === args.module);
      if (existing) {
        const { error } = await db
          .from("user_permissions")
          .update({ [args.field]: args.value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("user_permissions").insert({
          tenant_id: me?.tenantId,
          user_id: args.userId,
          module: args.module,
          [args.field]: args.value,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all_perms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function value(userId: string, module: string, field: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (perms.data ?? []).find((x: any) => x.user_id === userId && x.module === module);
    return p ? !!p[field] : false;
  }

  return (
    <div>
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="تحديد صلاحيات الإضافة والتعديل والحذف والاستعراض لكل مستخدم على كل بطاقة ودفتر"
      />
      {me?.tenantId && can(me, "users", "create") && (
        <div className="mb-4 flex justify-end">
          <NewUserDialog
            tenantId={me.tenantId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allowAdmin={me.isSuperAdmin || !!(me as any).isTenantAdmin}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ["profiles"] });
              qc.invalidateQueries({ queryKey: ["all_perms"] });
            }}
          />
        </div>
      )}

      <div className="space-y-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(users.data ?? []).map((u: any) => (
          <div key={u.id} className="rounded-lg border bg-card p-5">
            <h2 className="font-bold">
              {u.full_name}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {u.email} {u.is_super_admin ? "· مالك النظام" : ""}
              </span>
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="border px-2 py-2 text-right">الواجهة</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="border px-2 py-2 text-center">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m}>
                      <td className="border px-2 py-2">{MODULE_LABEL[m]}</td>
                      {ACTIONS.map((a) => (
                        <td key={a.key} className="border px-2 py-2 text-center">
                          <Checkbox
                            checked={value(u.id, m, a.key)}
                            disabled={!editable}
                            onCheckedChange={(v) =>
                              setPerm.mutate({ userId: u.id, module: m, field: a.key, value: !!v })
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createUserAccount } from "@/lib/admin.functions";
import { MODULE_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MODULES = Object.keys(MODULE_LABEL);
const ACTIONS = [
  { key: "can_view", label: "استعراض" },
  { key: "can_create", label: "إضافة" },
  { key: "can_edit", label: "تعديل" },
  { key: "can_delete", label: "حذف" },
] as const;
type ActionKey = (typeof ACTIONS)[number]["key"];
type Perm = Record<ActionKey, boolean>;

const EMPTY: Perm = { can_view: false, can_create: false, can_edit: false, can_delete: false };
const emptyPerms = () =>
  Object.fromEntries(
    MODULES.map((m) => [m, { can_view: false, can_create: false, can_edit: false, can_delete: false }]),
  ) as Record<string, Perm>;

export function NewUserDialog({
  tenantId,
  allowAdmin,
  onCreated,
}: {
  tenantId: string;
  allowAdmin: boolean;
  onCreated: () => void;
}) {
  const create = useServerFn(createUserAccount);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<Record<string, Perm>>(emptyPerms);

  function toggle(m: string, k: ActionKey, v: boolean) {
    setPerms((p) => {
      const row: Perm = { ...(p[m] ?? EMPTY), [k]: v };
      if (k !== "can_view" && v) row.can_view = true;
      if (k === "can_view" && !v) Object.assign(row, { can_create: false, can_edit: false, can_delete: false });
      return { ...p, [m]: row };
    });
  }
  function toggleAllRow(m: string, v: boolean) {
    setPerms((p) => ({ ...p, [m]: { can_view: v, can_create: v, can_edit: v, can_delete: v } }));
  }
  function toggleAllCol(k: ActionKey, v: boolean) {
    MODULES.forEach((m) => toggle(m, k, v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          tenantId,
          fullName,
          email,
          password,
          isTenantAdmin: isAdmin,
          permissions: MODULES.map((m) => ({ module: m, ...(perms[m] ?? EMPTY) })),
        },
      });
      toast.success("تم إنشاء المستخدم");
      setOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setIsAdmin(false);
      setPerms(emptyPerms());
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ مستخدم جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء مستخدم جديد ضمن الشركة</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>الاسم الكامل</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>البريد (اسم الدخول)</Label>
              <Input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input required minLength={6} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {allowAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAdmin} onCheckedChange={(v) => setIsAdmin(!!v)} />
              مدير للشركة (كل الصلاحيات)
            </label>
          )}
          {!isAdmin && (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="border px-2 py-2 text-right">الواجهة</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="border px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {a.label}
                          <Checkbox
                            checked={MODULES.every((m) => (perms[m] ?? EMPTY)[a.key])}
                            onCheckedChange={(v) => toggleAllCol(a.key, !!v)}
                          />
                        </div>
                      </th>
                    ))}
                    <th className="border px-2 py-2 text-center">الكل</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m}>
                      <td className="border px-2 py-1.5">{MODULE_LABEL[m]}</td>
                      {ACTIONS.map((a) => (
                        <td key={a.key} className="border px-2 py-1.5 text-center">
                          <Checkbox checked={(perms[m] ?? EMPTY)[a.key]} onCheckedChange={(v) => toggle(m, a.key, !!v)} />
                        </td>
                      ))}
                      <td className="border px-2 py-1.5 text-center">
                        <Checkbox
                          checked={ACTIONS.every((a) => (perms[m] ?? EMPTY)[a.key])}
                          onCheckedChange={(v) => toggleAllRow(m, !!v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

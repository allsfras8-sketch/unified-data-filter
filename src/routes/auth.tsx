import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { bootstrapOwner, ownerExists } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | المنظومة المحاسبية" },
      { name: "description", content: "الدخول إلى نظام المحاسبة وإدارة المشاريع متعدد الشركات." },
      { property: "og:title", content: "تسجيل الدخول | المنظومة المحاسبية" },
      { property: "og:description", content: "الدخول إلى نظام المحاسبة وإدارة المشاريع." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const checkOwner = useServerFn(ownerExists);
  const createOwner = useServerFn(bootstrapOwner);

  const owner = useQuery({
    queryKey: ["owner_exists"],
    queryFn: () => checkOwner({}),
    staleTime: 0,
  });
  const needsOwner = owner.data?.exists === false;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    try {
      if (needsOwner) {
        await createOwner({ data: { email, password, fullName } });
        toast.success("تم إنشاء حساب مدير النظام");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("تم تسجيل الدخول");
      navigate({ to: "/dashboard" }); // super admin is redirected to /companies by AppShell
    } catch (err) {
      toast.error((err as Error).message || "تعذر إتمام العملية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <ShieldCheck className="size-7" />
          <h1 className="text-xl font-bold">المنظومة المحاسبية</h1>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {needsOwner
            ? "لا يوجد مدير نظام بعد. أنشئ حساب مدير النظام للبدء."
            : "الحسابات يُنشئها مدير النظام. أدخل بيانات الدخول التي زوّدك بها."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {needsOwner && (
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جارٍ المعالجة..." : needsOwner ? "إنشاء حساب مدير النظام" : "دخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}

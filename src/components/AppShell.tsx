import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, moduleEnabled } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Building2,
  ClipboardList,
  Coins,
  Gauge,
  HardHat,
  LogOut,
  Package,
  Receipt,
  ScrollText,
  Truck,
  Users,
  Warehouse,
  Landmark,
  FileText,
  Settings,
  Languages,
  ScrollText as LedgerIcon,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof Gauge; module?: string; superOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "لوحة المؤشرات", icon: Gauge },
  { to: "/companies", label: "إدارة الشركات", icon: Building2, superOnly: true },
  { to: "/subscriptions", label: "الاشتراكات والمقبوضات", icon: Coins, superOnly: true },
  { to: "/accounts", label: "شجرة الحسابات", icon: BookOpen, module: "accounts" },
  { to: "/journal", label: "دفتر اليومية العامة", icon: ScrollText, module: "journal" },
  { to: "/documents", label: "المستندات والفواتير", icon: FileText, module: "documents" },
  { to: "/partners", label: "الزبائن والموردون", icon: Users, module: "partners" },
  { to: "/cheques", label: "الشيكات والبنوك", icon: Receipt, module: "cheques" },
  { to: "/assets", label: "الأصول الثابتة", icon: Landmark, module: "assets" },
  { to: "/products", label: "بطاقات المواد", icon: Package, module: "products" },
  { to: "/warehouses", label: "المستودعات", icon: Warehouse, module: "warehouses" },
  { to: "/stock", label: "حركات المخزون", icon: Truck, module: "stock" },
  { to: "/projects", label: "المشاريع والتعهدات", icon: HardHat, module: "projects" },
  { to: "/reports", label: "التقارير المالية", icon: Coins, module: "reports" },
  { to: "/ledgers", label: "دفاتر الأستاذ والكشوف", icon: LedgerIcon, module: "reports" },
  { to: "/users", label: "المستخدمون والصلاحيات", icon: Users, module: "users" },
  { to: "/settings", label: "إعدادات الربط المحاسبي", icon: Settings, module: "accounts" },
  { to: "/audit", label: "سجل حركات المستخدمين", icon: ClipboardList, module: "audit" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const superAllowed = ["/companies", "/subscriptions"];
  useEffect(() => {
    if (me?.isSuperAdmin && !superAllowed.some((p) => pathname.startsWith(p))) {
      navigate({ to: "/companies", replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.isSuperAdmin, pathname]);

  if (me?.tenantLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <p className="font-bold">{t("حساب الشركة مقفل")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("انتهى اشتراك الشركة أو تم إيقافه. يرجى التواصل مع مدير النظام لتجديد الاشتراك.")}
          </p>
          <button onClick={signOut} className="mt-4 rounded-md border px-4 py-2 text-sm">
            {t("تسجيل الخروج")}
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && me === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("لا يوجد حساب مرتبط بهذا الدخول. يرجى مراجعة مدير النظام لإنشاء حسابك.")}
          </p>
          <button
            onClick={signOut}
            className="mt-4 rounded-md border px-4 py-2 text-sm"
          >
            {t("تسجيل الخروج")}
          </button>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => {
    if (me?.isSuperAdmin) return !!n.superOnly;
    if (n.superOnly) return false;
    if (!n.module) return true;
    return moduleEnabled(me, n.module);
  });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-4">
          <div className="text-lg font-bold">{t("المنظومة المحاسبية")}</div>
          <div className="mt-1 text-xs text-sidebar-foreground/70">
            {me?.isSuperAdmin ? t("مالك النظام") : (me?.tenantName ?? "—")}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <Languages className="size-4" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <div className="px-2 pb-2 text-xs text-sidebar-foreground/70">{me?.email}</div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
            {t("تسجيل الخروج")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center justify-between border-b bg-card px-5 py-3 md:hidden">
          <span className="font-bold text-primary">{t("المنظومة المحاسبية")}</span>
          <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="text-sm text-muted-foreground"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <button onClick={signOut} className="text-sm text-muted-foreground">
            {t("خروج")}
          </button>
          </div>
        </header>
        <div className="no-print overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
          <div className="flex gap-2">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md border px-3 py-1 text-xs"
              >
                {t(item.label)}
              </Link>
            ))}
          </div>
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Building2, HardHat, ShieldCheck, Warehouse } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "المنظومة المحاسبية وإدارة المشاريع" },
      {
        name: "description",
        content:
          "نظام محاسبي عربي متكامل متعدد الشركات: شجرة حسابات، يومية عامة، مخازن، مشاريع وتعهدات، وتقارير مالية فورية.",
      },
      { property: "og:title", content: "المنظومة المحاسبية وإدارة المشاريع" },
      {
        property: "og:description",
        content: "إدارة شركات متعددة، محاسبة دقيقة بالدولار والليرة السورية، مخازن ومشاريع وتقارير.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Building2, title: "إدارة الشركات", desc: "لوحة تحكم المالك لإنشاء الشركات وتفعيل الوحدات والصلاحيات." },
  { icon: BookOpen, title: "محاسبة دقيقة", desc: "شجرة حسابات، يومية عامة متوازنة إجبارياً، وتقارير مالية فورية." },
  { icon: Warehouse, title: "المخازن", desc: "بطاقة مادة، تكلفة وسطية مرجّحة، ومنع المخزون السالب." },
  { icon: HardHat, title: "المشاريع والتعهدات", desc: "بطاقة مشروع، نسبة إنجاز، موازنة تقديرية مقابل التكلفة الفعلية." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-primary">
            <ShieldCheck className="size-6" />
            <span>المنظومة المحاسبية</span>
          </div>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            تسجيل الدخول
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-extrabold leading-tight text-foreground md:text-5xl">
          نظام محاسبة وتعهدات متعدد الشركات
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          محاسبة كاملة باللغة العربية بعملتين: الدولار الأمريكي كعملة أساسية والليرة السورية كعملة ثانوية، مع عزل
          كامل لبيانات كل شركة وصلاحيات تفصيلية لكل مستخدم.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            ابدأ الآن
          </Link>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <f.icon className="size-8 text-accent" />
              <h2 className="mt-4 font-bold text-card-foreground">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

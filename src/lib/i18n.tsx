import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setDictionary, startTranslating, stopTranslating } from "./dom-translate";

export type Lang = "ar" | "en";

/**
 * Translation map keyed by the Arabic source string. The app is authored in
 * Arabic; `t()` returns the English equivalent when the language is switched.
 */
const EN: Record<string, string> = {
  // shell / nav
  "المنظومة المحاسبية": "Accounting System",
  "لوحة المؤشرات": "Dashboard",
  "إدارة الشركات": "Companies",
  "شجرة الحسابات": "Chart of Accounts",
  "دفتر اليومية العامة": "General Journal",
  "المستندات والفواتير": "Documents & Invoices",
  "الزبائن والموردون": "Customers & Suppliers",
  "الشيكات والبنوك": "Cheques & Banks",
  "الأصول الثابتة": "Fixed Assets",
  "بطاقات المواد": "Product Cards",
  المستودعات: "Warehouses",
  "حركات المخزون": "Stock Movements",
  "المشاريع والتعهدات": "Projects & Contracts",
  "التقارير المالية": "Financial Reports",
  "دفاتر الأستاذ والكشوف": "Ledgers & Statements",
  "المستخدمون والصلاحيات": "Users & Permissions",
  "إعدادات الربط المحاسبي": "Accounting Links",
  "سجل حركات المستخدمين": "Audit Log",
  "تسجيل الخروج": "Sign out",
  خروج: "Sign out",
  "مالك النظام": "System owner",

  // generic ui
  إضافة: "Add",
  تعديل: "Edit",
  حذف: "Delete",
  حفظ: "Save",
  إلغاء: "Cancel",
  طباعة: "Print",
  "تصدير إلى إكسل": "Export to Excel",
  "استيراد من إكسل": "Import from Excel",
  "تحميل القالب": "Download template",
  "بحث...": "Search...",
  إجراءات: "Actions",
  "لا توجد بيانات": "No data",
  "لا توجد حركات": "No movements",
  "جارٍ التحميل...": "Loading...",
  الإجمالي: "Total",
  "تأكيد الحذف": "Confirm deletion",
  "هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.":
    "Are you sure you want to delete this record? This cannot be undone.",
  "تم الحذف": "Deleted",
  "تمت الإضافة بنجاح": "Added successfully",
  "تم حفظ التعديلات": "Changes saved",
  "— اختر —": "— select —",
  نعم: "Yes",
  لا: "No",
  نشط: "Active",
  "غير نشط": "Inactive",
  "من تاريخ": "From date",
  "إلى تاريخ": "To date",
  التاريخ: "Date",
  البيان: "Description",
  مدين: "Debit",
  دائن: "Credit",
  "الرصيد المتحرك": "Running balance",
  الرصيد: "Balance",
  "رصيد أول المدة": "Opening balance",
  "رصيد آخر المدة": "Closing balance",
  الكمية: "Quantity",
  "الكمية الواردة": "Inbound",
  "الكمية الصادرة": "Outbound",
  "الرصيد المتحرك للكمية": "Running quantity",
  المرجع: "Reference",
  المادة: "Product",
  المستودع: "Warehouse",
  الحساب: "Account",
  الجهة: "Partner",
  المشروع: "Project",
  "رقم القيد": "Entry no.",
  "كشف حساب": "Statement of account",
  "الرمز": "Code",
  الاسم: "Name",

  // ledgers page
  "دفاتر الأستاذ التاريخية": "Historical ledgers",
  "اختر الفترة الزمنية ثم اعرض الكشف، ويمكن طباعته أو تصديره إلى إكسل":
    "Pick a date range, then view, print or export the ledger",
  "أستاذ المواد": "Product stock ledger",
  "أستاذ المستودع": "Warehouse ledger",
  "كشوف الزبائن والموردين": "Customer & supplier statements",
  "أستاذ حساب": "GL account ledger",
  عرض: "View",
  "اختر المادة": "Select a product",
  "اختر المستودع": "Select a warehouse",
  "اختر الجهة": "Select a partner",
  "اختر الحساب": "Select an account",
  "جميع المبالغ معادلة بالدولار الأمريكي ($)": "All amounts are shown in US dollars ($)",

  // import
  "استيراد بيانات": "Import data",
  "اختر ملف CSV أو Excel (محفوظ بصيغة CSV) بنفس أعمدة القالب":
    "Choose a CSV file (or an Excel sheet saved as CSV) matching the template columns",
  "الأعمدة المطلوبة": "Required columns",
  "تم استيراد": "Imported",
  سجل: "record(s)",
  "الملف فارغ أو غير صالح": "The file is empty or invalid",
  "صف": "Row",
  "استيراد": "Import",
  "تجاهل الصفوف غير الصالحة والمتابعة": "Skip invalid rows and continue",

  // companies wizard
  "حساب شركة جديد": "New company account",
  "نظام الحسابات الابتدائي": "Initial accounting framework",
  "نظام فارغ (بدون أي حسابات)": "Blank system (no accounts)",
  "الدليل المحاسبي الموحد": "Standard unified chart of accounts",
  "نظام بيانات تجريبية": "Demo data system",
  "يحدد ما سيُنشأ تلقائياً داخل الشركة الجديدة": "Determines what is created automatically inside the new company",
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string; dir: "rtl" | "ltr" };

const I18nContext = createContext<Ctx>({ lang: "ar", setLang: () => {}, t: (s) => s, dir: "rtl" });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    setDictionary(EN);
    if (lang === "en") startTranslating();
    else stopTranslating();
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((s: string) => (lang === "en" ? (EN[s] ?? s) : s), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

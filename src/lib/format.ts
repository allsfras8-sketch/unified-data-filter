export const CURRENCY_LABEL: Record<string, string> = { USD: "$", SYP: "ل.س" };

export const ACCOUNT_NATURE_LABEL: Record<string, string> = {
  closing: "ختامي",
  balance_sheet: "ميزانية",
  profit_loss: "أرباح وخسائر",
};

export const PARTNER_TYPE_LABEL: Record<string, string> = {
  customer: "زبون",
  supplier: "مورد",
  both: "زبون ومورد",
};

export const CHEQUE_STATUS_LABEL: Record<string, string> = {
  pending: "قيد التحصيل",
  collected: "محصّل",
  returned: "مرتجع",
  cancelled: "ملغى",
};

export const CHEQUE_DIRECTION_LABEL: Record<string, string> = {
  incoming: "وارد (برسم التحصيل)",
  outgoing: "صادر (مدفوع)",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: "قيد التنفيذ",
  on_hold: "متوقف",
  closed: "مغلق",
};

export const MOVE_DIRECTION_LABEL: Record<string, string> = { in: "إدخال", out: "إخراج" };

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};

export const MODULE_LABEL: Record<string, string> = {
  accounts: "الحسابات",
  journal: "اليومية العامة",
  documents: "المستندات والفواتير",
  partners: "الزبائن والموردون",
  cheques: "الشيكات والبنوك",
  assets: "الأصول الثابتة",
  products: "بطاقات المواد",
  warehouses: "المستودعات",
  stock: "حركات المخزون",
  projects: "المشاريع",
  reports: "التقارير",
  users: "المستخدمون",
  audit: "سجل الحركات",
};

export function fmtNum(v: number | string | null | undefined, digits = 2) {
  const n = Number(v ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtMoney(v: number | string | null | undefined, currency = "USD") {
  return `${fmtNum(v)} ${CURRENCY_LABEL[currency] ?? currency}`;
}

export function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("ar-SY", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function fmtDateTime(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("ar-SY");
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

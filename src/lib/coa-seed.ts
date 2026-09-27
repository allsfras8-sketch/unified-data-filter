/** Standard unified chart of accounts (hierarchical, Arabic + English). */
export type SeedAccount = {
  code: string;
  name: string;
  nameEn: string;
  parent?: string;
  nature: "balance_sheet" | "profit_loss" | "closing";
  isGroup?: boolean;
};

export const UNIFIED_COA: SeedAccount[] = [
  { code: "1", name: "الأصول", nameEn: "Assets", nature: "balance_sheet", isGroup: true },
  { code: "11", name: "الأصول المتداولة", nameEn: "Current Assets", parent: "1", nature: "balance_sheet", isGroup: true },
  { code: "1100", name: "النقدية وما يعادلها", nameEn: "Cash and Equivalents", parent: "11", nature: "balance_sheet", isGroup: true },
  { code: "1101", name: "الصندوق", nameEn: "Cash on Hand", parent: "1100", nature: "balance_sheet" },
  { code: "1102", name: "المصارف", nameEn: "Banks", parent: "1100", nature: "balance_sheet" },
  { code: "1103", name: "شيكات برسم التحصيل", nameEn: "Cheques Under Collection", parent: "1100", nature: "balance_sheet" },
  { code: "1200", name: "الذمم المدينة", nameEn: "Receivables", parent: "11", nature: "balance_sheet", isGroup: true },
  { code: "1201", name: "الزبائن", nameEn: "Customers", parent: "1200", nature: "balance_sheet" },
  { code: "1202", name: "سلف وأمانات", nameEn: "Advances and Deposits", parent: "1200", nature: "balance_sheet" },
  { code: "1300", name: "المخزون", nameEn: "Inventory", parent: "11", nature: "balance_sheet", isGroup: true },
  { code: "1301", name: "مخزون المواد", nameEn: "Materials Inventory", parent: "1300", nature: "balance_sheet" },
  { code: "1302", name: "أعمال تحت التنفيذ", nameEn: "Work in Progress", parent: "1300", nature: "balance_sheet" },
  { code: "12", name: "الأصول الثابتة", nameEn: "Fixed Assets", parent: "1", nature: "balance_sheet", isGroup: true },
  { code: "1201F", name: "الآليات والمعدات", nameEn: "Machinery and Equipment", parent: "12", nature: "balance_sheet" },
  { code: "1202F", name: "السيارات", nameEn: "Vehicles", parent: "12", nature: "balance_sheet" },
  { code: "1203F", name: "الأثاث والتجهيزات", nameEn: "Furniture and Fixtures", parent: "12", nature: "balance_sheet" },
  { code: "1290", name: "مجمع الاهتلاك", nameEn: "Accumulated Depreciation", parent: "12", nature: "balance_sheet" },

  { code: "2", name: "الخصوم", nameEn: "Liabilities", nature: "balance_sheet", isGroup: true },
  { code: "21", name: "الخصوم المتداولة", nameEn: "Current Liabilities", parent: "2", nature: "balance_sheet", isGroup: true },
  { code: "2101", name: "الموردون", nameEn: "Suppliers", parent: "21", nature: "balance_sheet" },
  { code: "2102", name: "شيكات صادرة", nameEn: "Cheques Payable", parent: "21", nature: "balance_sheet" },
  { code: "2103", name: "مصاريف مستحقة", nameEn: "Accrued Expenses", parent: "21", nature: "balance_sheet" },
  { code: "2104", name: "دفعات مقبوضة مقدماً", nameEn: "Advance Payments Received", parent: "21", nature: "balance_sheet" },
  { code: "22", name: "الخصوم طويلة الأجل", nameEn: "Long-Term Liabilities", parent: "2", nature: "balance_sheet", isGroup: true },
  { code: "2201", name: "قروض طويلة الأجل", nameEn: "Long-Term Loans", parent: "22", nature: "balance_sheet" },

  { code: "3", name: "حقوق الملكية", nameEn: "Equity", nature: "balance_sheet", isGroup: true },
  { code: "3101", name: "رأس المال", nameEn: "Capital", parent: "3", nature: "balance_sheet" },
  { code: "3102", name: "الاحتياطيات", nameEn: "Reserves", parent: "3", nature: "balance_sheet" },
  { code: "3103", name: "الأرباح المدورة", nameEn: "Retained Earnings", parent: "3", nature: "balance_sheet" },
  { code: "3104", name: "حساب الجاري للشركاء", nameEn: "Partners Current Account", parent: "3", nature: "balance_sheet" },

  { code: "4", name: "الإيرادات", nameEn: "Revenue", nature: "profit_loss", isGroup: true },
  { code: "4101", name: "إيرادات المبيعات", nameEn: "Sales Revenue", parent: "4", nature: "profit_loss" },
  { code: "4102", name: "إيرادات المقاولات والمشاريع", nameEn: "Contracting and Project Revenue", parent: "4", nature: "profit_loss" },
  { code: "4103", name: "إيرادات أخرى", nameEn: "Other Revenue", parent: "4", nature: "profit_loss" },

  { code: "5", name: "المصاريف والتكاليف", nameEn: "Expenses and Costs", nature: "profit_loss", isGroup: true },
  { code: "51", name: "التكاليف المباشرة", nameEn: "Direct Costs", parent: "5", nature: "profit_loss", isGroup: true },
  { code: "5101", name: "تكلفة المبيعات", nameEn: "Cost of Sales", parent: "51", nature: "profit_loss" },
  { code: "5102", name: "تكاليف المشاريع", nameEn: "Project Costs", parent: "51", nature: "profit_loss" },
  { code: "5103", name: "أجور عمال", nameEn: "Labour Wages", parent: "51", nature: "profit_loss" },
  { code: "52", name: "المصاريف التشغيلية", nameEn: "Operating Expenses", parent: "5", nature: "profit_loss", isGroup: true },
  { code: "5201", name: "الرواتب والأجور", nameEn: "Salaries and Wages", parent: "52", nature: "profit_loss" },
  { code: "5202", name: "الإيجارات", nameEn: "Rent", parent: "52", nature: "profit_loss" },
  { code: "5203", name: "الكهرباء والماء والاتصالات", nameEn: "Utilities and Communications", parent: "52", nature: "profit_loss" },
  { code: "5204", name: "المحروقات والنقل", nameEn: "Fuel and Transport", parent: "52", nature: "profit_loss" },
  { code: "5205", name: "الصيانة", nameEn: "Maintenance", parent: "52", nature: "profit_loss" },
  { code: "5206", name: "مصاريف الاهتلاك", nameEn: "Depreciation Expense", parent: "52", nature: "profit_loss" },
  { code: "5207", name: "مصاريف إدارية وعمومية", nameEn: "General and Administrative", parent: "52", nature: "profit_loss" },

  { code: "9", name: "الحسابات الختامية", nameEn: "Closing Accounts", nature: "closing", isGroup: true },
  { code: "9101", name: "حساب المتاجرة", nameEn: "Trading Account", parent: "9", nature: "closing" },
  { code: "9102", name: "حساب الأرباح والخسائر", nameEn: "Profit and Loss Account", parent: "9", nature: "closing" },
];

/** Account codes wired into the automatic posting settings. */
export const SETTINGS_MAP = {
  cash_account_id: "1101",
  customers_account_id: "1201",
  suppliers_account_id: "2101",
  inventory_account_id: "1301",
  sales_account_id: "4101",
  cogs_account_id: "5101",
  project_cost_account_id: "5102",
};

export const DEMO_WAREHOUSES = [
  { code: "WH1", name: "المستودع الرئيسي", location: "المقر العام" },
  { code: "WH2", name: "مستودع الموقع", location: "موقع المشروع" },
];

export const DEMO_PRODUCTS = [
  { sku: "P-001", name: "إسمنت بورتلاندي", unit: "طن", category: "مواد بناء" },
  { sku: "P-002", name: "حديد تسليح 12 مم", unit: "طن", category: "مواد بناء" },
  { sku: "P-003", name: "رمل ناعم", unit: "م3", category: "مواد بناء" },
  { sku: "P-004", name: "بلوك إسمنتي", unit: "قطعة", category: "مواد بناء" },
];

export const DEMO_PARTNERS = [
  { code: "S-001", name: "مؤسسة البناء للتوريدات", partner_type: "supplier", account: "2101" },
  { code: "S-002", name: "شركة الحديد الوطنية", partner_type: "supplier", account: "2101" },
  { code: "C-001", name: "بلدية المدينة", partner_type: "customer", account: "1201" },
  { code: "C-002", name: "شركة الإعمار الحديثة", partner_type: "customer", account: "1201" },
];

export const DEMO_PROJECTS = [
  { code: "PRJ-01", name: "مشروع تأهيل الطريق العام", contract_value: 250000, status: "active" },
  { code: "PRJ-02", name: "مشروع بناء مدرسة", contract_value: 400000, status: "active" },
];

/** Opening journal entry: capital, cash and bank balances. */
export const DEMO_OPENING = [
  { account: "1101", debit: 50000, credit: 0, description: "رصيد افتتاحي - الصندوق" },
  { account: "1102", debit: 150000, credit: 0, description: "رصيد افتتاحي - المصارف" },
  { account: "3101", debit: 0, credit: 200000, description: "رصيد افتتاحي - رأس المال" },
];

/* Static demo data + navigation config for the SalesPulse dashboard.
   Kept framework-free so it can be imported by any client component. */

export type TabId =
  | "overview"
  | "management"
  | "comparison"
  | "staff"
  | "recordings"
  | "upload"
  | "deep-audit"
  | "operators"
  | "categories"
  | "criteria"
  | "amocrm";

export interface NavItem {
  id: TabId;
  label: string;
  hint: string;
  icon: string; // key into the Icons map
  /* per-item gradient (from-/to-) so each menu entry has its own identity */
  grad: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "ASOSIY",
    items: [
      { id: "overview", label: "Umumiy ko'rinish", hint: "Boshqaruv paneli", icon: "grid", grad: "from-indigo-500 to-violet-500" },
      { id: "management", label: "Boshqaruv paneli", hint: "Rahbariyat ko'rinishi", icon: "trendingUp", grad: "from-violet-500 to-fuchsia-500" },
      { id: "comparison", label: "Solishtirish paneli", hint: "Kunlik/haftalik/oylik", icon: "trendingUp", grad: "from-amber-500 to-orange-500" },
      { id: "staff", label: "Xodimlarni boshqarish", hint: "Barcha xodimlar", icon: "users", grad: "from-rose-500 to-pink-500" },
      { id: "recordings", label: "Audio yozuvlar", hint: "Transkripsiya jurnali", icon: "waveform", grad: "from-cyan-500 to-sky-500" },
      { id: "upload", label: "Audio yuklash", hint: "Yangi qo'ng'iroqlar", icon: "upload", grad: "from-emerald-500 to-teal-500" },
      { id: "deep-audit", label: "Chuqur tahlil", hint: "Advanced Deep Audit", icon: "scan", grad: "from-fuchsia-500 to-pink-500" },
    ],
  },
  {
    title: "SOZLAMALAR",
    items: [
      { id: "operators", label: "Operatorlar", hint: "Jamoa boshqaruvi", icon: "users", grad: "from-amber-500 to-orange-500" },
      { id: "categories", label: "Mezon kategoriyalari", hint: "Guruhlash", icon: "layers", grad: "from-rose-500 to-red-500" },
      { id: "criteria", label: "Baholash mezonlari", hint: "Ballash qoidalari", icon: "ruler", grad: "from-sky-500 to-blue-500" },
      { id: "amocrm", label: "amoCRM ulanishi", hint: "Integratsiya", icon: "plug", grad: "from-teal-500 to-emerald-500" },
    ],
  },
];

/* Xodimning shaxsiy ko'rsatkichlari (ball, qo'ng'iroqlar, jarimalar, qo'ng'iroq
 * tarixi) backenddan Employee yozuvi orqali keladi — qarang app/lib/store.ts.
 * Statik/demo performance olib tashlandi; backend hali bu ma'lumotni bermasa,
 * dashboard bo'sh holatlarni ko'rsatadi. */

/* KPI kartalar shabloni — qiymatlar jonli backenddan (OverviewView) keladi.
 * Demo raqamlar olib tashlandi; ulanmaguncha «—» ko'rsatiladi. Sparkline'lar
 * dekorativ (ambient trend). */
export const STATS = [
  {
    key: "calls",
    label: "Jami qo'ng'iroqlar",
    value: "—",
    delta: "Jonli",
    trend: "up" as const,
    accent: "indigo" as const,
    icon: "phone",
    spark: [18, 24, 20, 30, 28, 42, 38, 52, 48, 61],
  },
  {
    key: "duration",
    label: "O'rtacha davomiylik",
    value: "—",
    delta: "Jonli",
    trend: "up" as const,
    accent: "cyan" as const,
    icon: "clock",
    spark: [40, 38, 42, 36, 34, 35, 30, 32, 28, 27],
  },
  {
    key: "score",
    label: "O'rtacha sifat bahosi",
    value: "—",
    delta: "Jonli",
    trend: "up" as const,
    accent: "emerald" as const,
    icon: "shield",
    spark: [60, 64, 62, 70, 68, 74, 72, 76, 79, 78],
  },
  {
    key: "tokens",
    label: "AI tahlil xarajati",
    value: "—",
    delta: "Ulanmagan",
    trend: "up" as const,
    accent: "violet" as const,
    icon: "spark",
    spark: [10, 22, 18, 30, 44, 40, 58, 66, 72, 90],
  },
];

/* Demo qo'ng'iroqlar (CALLS), mezon kategoriyalari (CATEGORIES) va deep-audit
 * namunasi (DEEP_AUDIT) olib tashlandi — barchasi backend/CRM'dan jonli keladi:
 *   • qo'ng'iroqlar  → GET /api/calls (RecordingsView, DeepAuditView)
 *   • operatorlar    → GET /users / /managers
 *   • mezonlar       → GET /criteria (app/lib/criteria.ts)
 * CRM ulanmaguncha sahifalar bo'sh holatlarni ko'rsatadi. */

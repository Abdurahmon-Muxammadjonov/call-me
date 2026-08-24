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
  /* Key into the backend's `company_sections` map (see lib/sections.tsx).
   * Several TabIds can share one key when they're really one feature area
   * being paywalled together (e.g. recordings/upload/deep-audit are all
   * "call_analytics"). Omitted entirely for the two sections the backend
   * always leaves unlocked (overview, amocrm) — no key means "never
   * locked", so SectionsProvider doesn't even need to know about them. */
  sectionKey?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "ASOSIY",
    items: [
      { id: "overview", label: "Analitika", hint: "Jamoa samaradorligi va kunlik hisobot", icon: "grid", grad: "from-indigo-500 to-violet-500" },
      { id: "management", label: "Boshqaruv paneli", hint: "Rahbariyat ko'rinishi", icon: "trendingUp", grad: "from-violet-500 to-fuchsia-500", sectionKey: "reports" },
      { id: "comparison", label: "Solishtirish paneli", hint: "Kunlik/haftalik/oylik", icon: "trendingUp", grad: "from-amber-500 to-orange-500", sectionKey: "reports" },
      { id: "staff", label: "Xodimlarni boshqarish", hint: "Barcha xodimlar", icon: "users", grad: "from-rose-500 to-pink-500", sectionKey: "staff" },
      { id: "recordings", label: "Audio yozuvlar", hint: "Transkripsiya jurnali", icon: "waveform", grad: "from-cyan-500 to-sky-500", sectionKey: "call_analytics" },
      { id: "upload", label: "Audio yuklash", hint: "Yangi qo'ng'iroqlar", icon: "upload", grad: "from-emerald-500 to-teal-500", sectionKey: "call_analytics" },
      { id: "deep-audit", label: "Chuqur tahlil", hint: "Advanced Deep Audit", icon: "scan", grad: "from-fuchsia-500 to-pink-500", sectionKey: "call_analytics" },
    ],
  },
  {
    title: "SOZLAMALAR",
    items: [
      { id: "operators", label: "Operatorlar", hint: "Jamoa boshqaruvi", icon: "users", grad: "from-amber-500 to-orange-500", sectionKey: "operators" },
      { id: "categories", label: "Mezon kategoriyalari", hint: "Guruhlash", icon: "layers", grad: "from-rose-500 to-red-500", sectionKey: "categories" },
      { id: "criteria", label: "Baholash mezonlari", hint: "Ballash qoidalari", icon: "ruler", grad: "from-sky-500 to-blue-500", sectionKey: "criteria" },
      { id: "amocrm", label: "amoCRM ulanishi", hint: "Integratsiya", icon: "plug", grad: "from-teal-500 to-emerald-500" },
    ],
  },
];

/* Xodimning shaxsiy ko'rsatkichlari (ball, qo'ng'iroqlar, jarimalar, qo'ng'iroq
 * tarixi) backenddan Employee yozuvi orqali keladi — qarang app/lib/store.ts.
 * Statik/demo performance olib tashlandi; backend hali bu ma'lumotni bermasa,
 * dashboard bo'sh holatlarni ko'rsatadi. */

/* Demo qo'ng'iroqlar (CALLS), mezon kategoriyalari (CATEGORIES) va deep-audit
 * namunasi (DEEP_AUDIT) olib tashlandi — barchasi backend/CRM'dan jonli keladi:
 *   • qo'ng'iroqlar  → GET /api/calls (RecordingsView, DeepAuditView)
 *   • operatorlar    → GET /users / /managers
 *   • mezonlar       → GET /criteria (app/lib/criteria.ts)
 * CRM ulanmaguncha sahifalar bo'sh holatlarni ko'rsatadi. */

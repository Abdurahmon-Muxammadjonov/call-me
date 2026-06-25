/* Static demo data + navigation config for the Procell dashboard.
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

export const STATS = [
  {
    key: "calls",
    label: "Jami qo'ng'iroqlar",
    value: "2,847",
    delta: "+12.4%",
    trend: "up" as const,
    accent: "indigo" as const,
    icon: "phone",
    spark: [18, 24, 20, 30, 28, 42, 38, 52, 48, 61],
  },
  {
    key: "duration",
    label: "O'rtacha davomiylik",
    value: "4:38",
    delta: "-0:21",
    trend: "down" as const,
    accent: "cyan" as const,
    icon: "clock",
    spark: [40, 38, 42, 36, 34, 35, 30, 32, 28, 27],
  },
  {
    key: "score",
    label: "O'rtacha sifat bahosi",
    value: "78.6",
    delta: "Anti-Gravity",
    trend: "up" as const,
    accent: "emerald" as const,
    icon: "shield",
    spark: [60, 64, 62, 70, 68, 74, 72, 76, 79, 78],
  },
  {
    key: "tokens",
    label: "Gemini token xarajati",
    value: "$142.90",
    delta: "1.92M tok",
    trend: "up" as const,
    accent: "violet" as const,
    icon: "spark",
    spark: [10, 22, 18, 30, 44, 40, 58, 66, 72, 90],
  },
];

export type CallStatus = "analyzed" | "processing" | "queued" | "failed";

export interface CallRecord {
  id: string;
  operator: string;
  phone: string;
  date: string;
  duration: string;
  score: number;
  status: CallStatus;
  topic: string;
}

export const CALLS: CallRecord[] = [
  { id: "CL-9821", operator: "Dilnoza Karimova", phone: "+998 90 123 45 67", date: "21 Iyun, 14:22", duration: "5:12", score: 92, status: "analyzed", topic: "Mahsulot bo'yicha maslahat" },
  { id: "CL-9820", operator: "Javohir Tursunov", phone: "+998 93 555 12 09", date: "21 Iyun, 13:58", duration: "3:44", score: 64, status: "analyzed", topic: "Shikoyat — yetkazib berish" },
  { id: "CL-9819", operator: "Madina Rahimova", phone: "+998 97 401 88 21", date: "21 Iyun, 13:31", duration: "7:03", score: 81, status: "analyzed", topic: "To'lov muammosi" },
  { id: "CL-9818", operator: "Sardor Aliyev", phone: "+998 94 220 33 10", date: "21 Iyun, 12:47", duration: "2:19", score: 0, status: "processing", topic: "Qaytarish so'rovi" },
  { id: "CL-9817", operator: "Dilnoza Karimova", phone: "+998 90 778 65 43", date: "21 Iyun, 12:05", duration: "6:38", score: 88, status: "analyzed", topic: "Yangi buyurtma" },
  { id: "CL-9816", operator: "Javohir Tursunov", phone: "+998 99 110 47 02", date: "21 Iyun, 11:40", duration: "1:52", score: 0, status: "queued", topic: "Texnik qo'llab-quvvatlash" },
  { id: "CL-9815", operator: "Madina Rahimova", phone: "+998 91 333 09 88", date: "21 Iyun, 11:12", duration: "4:27", score: 47, status: "analyzed", topic: "Bekor qilish" },
  { id: "CL-9814", operator: "Sardor Aliyev", phone: "+998 90 654 22 17", date: "21 Iyun, 10:35", duration: "0:58", score: 0, status: "failed", topic: "Tarif bo'yicha savol" },
];

/* Operatorlar (ishchilar) ro'yxati backenddan keladi — qarang
 * app/lib/store.ts (GET /users) va <CompanyView />. Statik ro'yxat yo'q. */

export interface Category {
  name: string;
  weight: number;
  criteria: number;
  color: string; // tailwind gradient stops
}

export const CATEGORIES: Category[] = [
  { name: "Salomlashish & Etiket", weight: 20, criteria: 6, color: "from-indigo-500 to-violet-500" },
  { name: "Ehtiyojni aniqlash", weight: 30, criteria: 8, color: "from-cyan-500 to-sky-500" },
  { name: "Mahsulot bilimi", weight: 25, criteria: 7, color: "from-emerald-500 to-teal-500" },
  { name: "Yakuniy bosqich & CRM", weight: 25, criteria: 5, color: "from-fuchsia-500 to-pink-500" },
];

/* Baholash mezonlari endi backenddan jonli yuklanadi — app/lib/criteria.ts
 * (GET/POST /criteria). Bu yerdagi statik ro'yxat olib tashlandi. */

/* Deep-audit demo — a single call broken down by the AI auditor. */
export const DEEP_AUDIT = {
  call: CALLS[1],
  overall: 64,
  sentiment: "Neytral → Salbiy",
  risk: "O'rta",
  summary:
    "Operator mijoz shikoyatini eshitdi, biroq yechimni aniq taklif qilmadi va kelishuvni CRM tizimiga kiritmadi. Ovoz ohangi professional, ammo empatiya yetishmadi.",
  breakdown: [
    { name: "Salomlashish & Etiket", score: 85 },
    { name: "Ehtiyojni aniqlash", score: 70 },
    { name: "Mahsulot bilimi", score: 58 },
    { name: "Yakuniy bosqich & CRM", score: 42 },
  ],
  flags: [
    { type: "Ijobiy", text: "Mijozni ism orqali samimiy kutib oldi.", tone: "good" as const },
    { type: "E'tibor", text: "Mijoz 2 marta bo'lindi — gapini oxirigacha eshitilmadi.", tone: "warn" as const },
    { type: "Kritik", text: "Kelishuv amoCRM'ga kiritilmadi — bitim yo'qolishi mumkin.", tone: "bad" as const },
  ],
  transcript: [
    { who: "Operator", t: "00:02", text: "Assalomu alaykum, Procell kompaniyasi, men Javohirman. Sizga qanday yordam bera olaman?" },
    { who: "Mijoz", t: "00:09", text: "Buyurtmam uch kun kechikdi, hech qanday xabar ham bo'lmadi." },
    { who: "Operator", t: "00:15", text: "Tushunaman, hozir tekshirib ko'raman..." },
    { who: "Mijoz", t: "00:21", text: "Iltimos, tezroq hal qiling, juda zarur edi." },
    { who: "Operator", t: "00:28", text: "Albatta, yetkazib berish bo'limiga uzatamiz, rahmat." },
  ],
};

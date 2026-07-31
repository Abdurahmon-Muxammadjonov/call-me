/* Landing-page pricing content — pure marketing data, not backend-driven.
 * Kept in one place so plan names/prices/discounts/features can be edited
 * without touching any component. */

export interface BillingPeriod {
  months: 1 | 3 | 6 | 12;
  discountPct: number;
  label: string;
}

export const BILLING_PERIODS: BillingPeriod[] = [
  { months: 1, discountPct: 0, label: "1 oy" },
  { months: 3, discountPct: 5, label: "3 oy" },
  { months: 6, discountPct: 10, label: "6 oy" },
  { months: 12, discountPct: 20, label: "12 oy" },
];

export function discountedMonthly(basePrice: number, discountPct: number): number {
  return Math.round(basePrice * (1 - discountPct / 100));
}

export interface PricingFeature {
  label: string;
  /* Per-plan id → included or not. */
  included: Record<PlanId, boolean>;
}

export interface PricingCategory {
  title: string;
  features: PricingFeature[];
}

export type PlanId = "start" | "standard" | "pro" | "enterprise";

export interface ManagerRange {
  kind: "fixed" | "range" | "unlimited";
  min?: number;
  max?: number;
  fixed?: number;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  capacityLabel: string;
  popular?: boolean;
  managers: ManagerRange;
  analysisNote: string;
  /* 3-4 ta eng muhim funksiya — narx tagida qisqa xulosa sifatida
   * ko'rsatiladi (to'liq ro'yxat pastda, kategoriyalar bo'yicha qoladi). */
  highlights: string[];
  /* Only "enterprise" has an adjustable hours/month stepper. */
  hoursPerMonth?: { default: number; min: number; max: number; step: number };
}

export const PLANS: PricingPlan[] = [
  {
    id: "start",
    name: "START",
    monthlyPrice: 300_000,
    capacityLabel: "~40%",
    managers: { kind: "fixed", fixed: 1 },
    analysisNote: "Har bir menejer uchun kuniga ~20-30 daqiqa",
    highlights: ["Audio tahlil", "Menejer/xodim baholash", "Qisqa xulosa"],
  },
  {
    id: "standard",
    name: "STANDART",
    monthlyPrice: 550_000,
    capacityLabel: "~60%",
    managers: { kind: "range", min: 1, max: 3 },
    analysisNote: "Har bir menejer uchun kuniga ~1 soat",
    highlights: ["To'liq audio tahlil", "Skript tekshiruvi", "CRM'ga avtomatik izoh", "Lid sifatini aniqlash"],
  },
  {
    id: "pro",
    name: "PRO",
    monthlyPrice: 799_000,
    capacityLabel: "100%",
    popular: true,
    managers: { kind: "range", min: 3, max: 10 },
    analysisNote: "Har bir menejer uchun kuniga 2-3 soat",
    highlights: ["Transkriptsiya", "To'liq sotuv jarayoni", "Vazifalar nazorati", "Cheksiz AI Treyner"],
  },
  {
    id: "enterprise",
    name: "ENTERPRISE / AI+",
    monthlyPrice: 1_200_000,
    capacityLabel: "100% + AI",
    managers: { kind: "unlimited" },
    analysisNote: "Tahlil hajmi oyiga soatlar bo'yicha belgilanadi",
    highlights: ["AI chat yordamchi", "Avtomatik reyting", "Muammoli qo'ng'iroq ogohlantirishi", "Trend tahlili"],
    hoursPerMonth: { default: 100, min: 20, max: 500, step: 10 },
  },
];

function row(label: string, included: Partial<Record<PlanId, boolean>>): PricingFeature {
  return {
    label,
    included: {
      start: included.start ?? false,
      standard: included.standard ?? false,
      pro: included.pro ?? false,
      enterprise: included.enterprise ?? false,
    },
  };
}

export const PRICING_CATEGORIES: PricingCategory[] = [
  {
    title: "Audio tahlil",
    features: [
      row("Audio faylni yuklash va avtomatik tahlil qilish", { start: true, standard: true, pro: true, enterprise: true }),
      row("Xodim mijoz bilan yaxshi yoki yomon gaplashganini baholash", { start: true, standard: true, pro: true, enterprise: true }),
      row("Qo'ng'iroq bo'yicha qisqa xulosa", { start: true, standard: true, pro: true, enterprise: true }),
      row("Skript bo'yicha tekshirish", { standard: true, pro: true, enterprise: true }),
      row("Xato va tavsiyalarni ko'rsatish", { standard: true, pro: true, enterprise: true }),
      row("E'tirozlar va ularga javoblarni ko'rsatish", { standard: true, pro: true, enterprise: true }),
      row("Nutq nisbati (xodim/mijoz gapirish vaqti)", { standard: true, pro: true, enterprise: true }),
      row("Mijoz portreti va ehtiyoji", { standard: true, pro: true, enterprise: true }),
      row("Yakuniy kelishuv / Keyingi qadamlar", { standard: true, pro: true, enterprise: true }),
      row("Transkriptsiya (matnga o'girish)", { pro: true, enterprise: true }),
    ],
  },
  {
    title: "Sotuv jarayoni",
    features: [
      row("CRM'ga avtomatik izohlar yozib ketish", { standard: true, pro: true, enterprise: true }),
      row("CRM'da avtomatik lid sifatini qo'shish", { standard: true, pro: true, enterprise: true }),
      row("Lid sifatini aniqlash", { standard: true, pro: true, enterprise: true }),
      row("Haftalik/oylik xulosalar", { pro: true, enterprise: true }),
    ],
  },
  {
    title: "Jarayonlar va vazifalar",
    features: [
      row("CRM'ga avtomatik vazifa qo'yish", { pro: true, enterprise: true }),
      row("Vazifalar vaqtida bajarilayotganini nazorat qilish", { pro: true, enterprise: true }),
      row("Voronka konversiyasini hisoblash", { pro: true, enterprise: true }),
    ],
  },
  {
    title: "Konversiya va vaqt",
    features: [
      row("Lidga bog'lanish tezligi", { pro: true, enterprise: true }),
      row("Liddan sotuvgacha bo'lgan muddat", { pro: true, enterprise: true }),
    ],
  },
  {
    title: "Qo'shimcha funksiyalar",
    features: [
      row("Qo'ng'iroqni tarjima qilish (boshqa tilga)", { pro: true, enterprise: true }),
      row("Cheksiz AI Treyner", { pro: true, enterprise: true }),
    ],
  },
  {
    title: "AI yordamchi (chat)",
    features: [
      row("Dashboard ichida AI chat orqali savol-javob", { enterprise: true }),
      row("Har bir menejer bo'yicha AI'dan tezkor tahliliy xulosa", { enterprise: true }),
      row("Eng yaxshi/zaif xodimlarni avtomatik aniqlab reyting berish", { enterprise: true }),
      row("Muammoli qo'ng'iroqlarni AI avtomatik ajratib ogohlantirishi", { enterprise: true }),
      row("Trend tahlili — AI grafik va matn bilan tushuntiradi", { enterprise: true }),
    ],
  },
];

/* Ton qoidalari (spetsifikatsiya §4.7) — BITTA modul, hamma joyda shu.
 *
 * Bu chegaralar dizayn bilan birga tasdiqlangan RANG/YORLIQ konstantalari,
 * biznes ma'lumoti emas. Biznes qiymatlari (maqsad ball, past ball
 * chegarasi, konversiya maqsadi) har doim argument sifatida /me dan
 * keladi — bu yerda ularning standart qiymati YO'Q. */

export type Tone = "good" | "warn" | "bad" | "neutral";

/* i18n kalitlari: pulse/i18n.ts → `tone.excellent` va h.k. */
export type ToneLabel = "excellent" | "good" | "average" | "low" | "none";

export interface ToneResult {
  tone: Tone;
  label: ToneLabel;
}

function isNum(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/* 4 darajali yorliq, 3 darajali rang. `targetScore10` = norms.targetScore10.
 * Maqsad noma'lum bo'lsa (null) "A‘lo" bandi shunchaki qo'llanmaydi. */
export function scoreTone(s: number | null | undefined, targetScore10: number | null | undefined): ToneResult {
  if (!isNum(s)) return { tone: "neutral", label: "none" };
  if (isNum(targetScore10) && s >= targetScore10) return { tone: "good", label: "excellent" };
  if (s >= 6.5) return { tone: "warn", label: "good" };
  if (s >= 5) return { tone: "warn", label: "average" };
  return { tone: "bad", label: "low" };
}

/* "Past ball" filtri va nishoni — "Past" yorlig'idan BOSHQA tushuncha. */
export function isLowScore(s: number | null | undefined, lowScoreThreshold10: number | null | undefined): boolean {
  return isNum(s) && isNum(lowScoreThreshold10) && s < lowScoreThreshold10;
}

/* Mezonlar, issiqlik to'ri. */
export function pctTone(p: number | null | undefined): Tone {
  if (!isNum(p)) return "neutral";
  if (p >= 80) return "good";
  if (p >= 50) return "warn";
  return "bad";
}

export function coverageTone(p: number | null | undefined): Tone {
  if (!isNum(p)) return "neutral";
  return p >= 25 ? "good" : "warn";
}

/* Puls va halqa plitkalari. */
export function indexTone(v: number | null | undefined): ToneResult {
  if (!isNum(v)) return { tone: "neutral", label: "none" };
  if (v >= 80) return { tone: "good", label: "excellent" };
  if (v >= 50) return { tone: "warn", label: "average" };
  return { tone: "bad", label: "low" };
}

export function conversionTone(pct: number | null | undefined, target: number | null | undefined): Tone {
  if (!isNum(pct) || !isNum(target)) return "neutral";
  if (pct >= target) return "good";
  if (pct >= 0.7 * target) return "warn";
  return "bad";
}

export function funnelStepTone(p: number | null | undefined): Tone {
  if (!isNum(p)) return "neutral";
  return p < 60 ? "bad" : "good";
}

/* Qaysi yo'nalish "yaxshi" — ko'rsatkichga bog'liq (§4.7). */
export type GoodDirection = "up" | "down";

export type MetricKind =
  | "calls" | "talk" | "longCalls" | "score" | "avgDuration" | "leads" | "offers" | "deals" | "conversion" | "coverage"
  | "negative" | "penalty" | "lagging" | "lowScore";

const DOWN_IS_GOOD: ReadonlySet<MetricKind> = new Set(["negative", "penalty", "lagging", "lowScore"]);

export function goodDirection(metric: MetricKind): GoodDirection {
  return DOWN_IS_GOOD.has(metric) ? "down" : "up";
}

export function deltaTone(delta: number | null | undefined, direction: GoodDirection): Tone {
  if (!isNum(delta) || delta === 0) return "neutral";
  const up = delta > 0;
  return up === (direction === "up") ? "good" : "bad";
}

/* Ton → token nomlari. Komponentlar xom hex emas, shularni ishlatadi. */
export const TONE_VARS: Record<Tone, { fg: string; tint: string; soft: string; ring: string }> = {
  good: { fg: "var(--pn-good)", tint: "var(--pn-good-tint)", soft: "var(--pn-good-soft)", ring: "var(--pn-good-ring)" },
  warn: { fg: "var(--pn-warn)", tint: "var(--pn-warn-tint)", soft: "var(--pn-warn-soft)", ring: "var(--pn-warn-ring)" },
  bad: { fg: "var(--pn-bad)", tint: "var(--pn-bad-tint)", soft: "var(--pn-bad-soft)", ring: "var(--pn-bad-ring)" },
  neutral: { fg: "var(--pn-muted)", tint: "var(--pn-panel-3)", soft: "var(--pn-text-2)", ring: "transparent" },
};

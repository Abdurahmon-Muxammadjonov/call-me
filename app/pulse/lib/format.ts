/* Pulse Noir raqam formatlari. Minglar ajratgichi — bo'linmas bo'shliq
 * (maketdagi "1 306" ko'rinishi, qatorda uzilmaydi). Noma'lum qiymat —
 * "—" (spetsifikatsiya §0.2: zaxira raqam yo'q). */

export const DASH = "—";
const NBSP = " ";

function isNum(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function fmtInt(v: number | null | undefined): string {
  if (!isNum(v)) return DASH;
  const sign = v < 0 ? "−" : "";
  const s = String(Math.round(Math.abs(v)));
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/* 1 kasr belgisi (ball, foiz): 4.2, 14.6. Butun bo'lsa ham kasr bilan. */
export function fmtDec(v: number | null | undefined, digits = 1): string {
  if (!isNum(v)) return DASH;
  const sign = v < 0 ? "−" : "";
  return sign + Math.abs(v).toFixed(digits);
}

/* Chegara qiymati: 5 → "5", 4.5 → "4.5" (ortiqcha nol yo'q). */
export function fmtThreshold(v: number | null | undefined): string {
  if (!isNum(v)) return DASH;
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(1)));
}

/* Belgili mutlaq o'zgarish: +12, 0, −3 (§6.2 pastel plitka). */
export function fmtSigned(v: number | null | undefined): string {
  if (!isNum(v)) return DASH;
  if (v === 0) return "0";
  return (v > 0 ? "+" : "−") + fmtInt(Math.abs(v));
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (!isNum(v)) return DASH;
  return `${fmtDec(v, digits)}%`;
}

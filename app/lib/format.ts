/* =====================================================================
 * RAQAMLARNI FORMATLASH — butun dashboard uchun YAGONA manba.
 *
 * Har bir sahifa o'zicha formatlaganda kelishmovchilik chiqardi: ball
 * bir joyda 0–100, boshqa joyda 0–10 ko'rinardi (Solishtirish panelida
 * "20.5 ball" chiqib qolgan edi — aslida 3.5/10). Shu sabab barcha
 * raqamlar shu yerdagi funksiyalardan o'tadi.
 * ===================================================================== */

/** Minglik ajratuvchi — bo'shliq: 1 306, 50 000. */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Foiz, bitta kasr bilan: 87.4%. */
export function formatPercent(n: number | null | undefined, decimals = 1): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

/**
 * BALL SHKALASI. Bazada ball 0–100 saqlanadi, ekranda esa 10 ballik
 * tizimda ko'rsatiladi. avg_kpi / avg_score / kpi_score ishlatiladigan
 * HAR BIR joy shu funksiyadan o'tishi shart.
 */
export function normalizeScore(value: number | null | undefined): number | null {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  // 10 dan katta bo'lsa — 0-100 shkalasi; aks holda allaqachon 10 ballik.
  const ten = v > 10 ? v / 10 : v;
  return Math.round(ten * 10) / 10;
}

/** Ball matni: "8.6" yoki yo'q bo'lsa "—". */
export function formatScore(value: number | null | undefined): string {
  const s = normalizeScore(value);
  return s === null ? "—" : s.toFixed(1);
}

export type ScoreGrade = "excellent" | "good" | "average" | "low";

/** 1.6 dagi qoida: ≥8 a'lo, 6.5–8 yaxshi, 5–6.5 o'rtacha, <5 past. */
export function scoreGrade(value: number | null | undefined): ScoreGrade | null {
  const s = normalizeScore(value);
  if (s === null) return null;
  if (s >= 8) return "excellent";
  if (s >= 6.5) return "good";
  if (s >= 5) return "average";
  return "low";
}

/** Skript bandi foizi rangi: ≥80 yashil, 50–80 sariq, <50 to'q sariq. */
export function percentTone(pct: number): "green" | "amber" | "orange" {
  if (pct >= 80) return "green";
  if (pct >= 50) return "amber";
  return "orange";
}

/** Davomiylik: qisqa "7:23", uzun "21 soat 17 daq". */
export function formatDuration(seconds: number | null | undefined, style: "clock" | "long" = "clock"): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (style === "long") {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h === 0) return `${m} daq`;
    return `${formatNumber(h)} soat ${m} daq`;
  }
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Daqiqalardan uzun ko'rinish: 1277 → "21 soat 17 daq". */
export function formatMinutes(minutes: number | null | undefined): string {
  return formatDuration((Number(minutes) || 0) * 60, "long");
}

export interface Delta {
  /** Foizdagi o'zgarish; oldingi davr 0 bo'lsa null. */
  pct: number | null;
  /** Matn: "↑ 12.5%" / "↓ 9.0%" / "—". */
  text: string;
  /** Rang: o'zgarish YAXSHI tomongami yoki yomon tomonga. */
  tone: "green" | "orange" | "neutral";
  direction: "up" | "down" | "flat";
}

/**
 * Ikki qiymat orasidagi o'zgarish.
 *
 * `higherIsBetter=false` — kamaygani yaxshi bo'lgan ko'rsatkichlar uchun
 * (javobsiz qo'ng'iroqlar, jarimalar, qisqa uzilishlar): kamaysa YASHIL.
 */
export function formatDelta(current: number, previous: number, higherIsBetter = true): Delta {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    return { pct: null, text: "—", tone: "neutral", direction: "flat" };
  }
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const good = pct === 0 ? null : higherIsBetter ? pct > 0 : pct < 0;
  return {
    pct,
    text: pct === 0 ? "0%" : `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct).toFixed(1)}%`,
    tone: good === null ? "neutral" : good ? "green" : "orange",
    direction,
  };
}

/** Pul: "+50 000" / "−20 000" (U+2212 minus). */
export function formatMoney(amount: number | null | undefined, withSign = false): string {
  const v = Math.round(Number(amount) || 0);
  const body = formatNumber(Math.abs(v));
  if (!withSign) return body;
  return v < 0 ? `−${body}` : `+${body}`;
}

/* ---------- Sana/vaqt (hammasi Asia/Tashkent) ---------- */
const TZ = "Asia/Tashkent";

export function tashkentDay(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offsetDays * 86400000));
}

/** Berilgan kundan N kun oldin/keyin: shiftDay("2026-09-27", -1) → "2026-09-26".
 * Taqqoslash HAR DOIM tanlangan kunga nisbatan bo'lishi uchun kerak —
 * ilgari "kechagiga nisbatan" har doim BUGUNGI kunning kechasi bilan
 * solishtirardi, shu bois kecha tanlanganda kun o'zi bilan taqqoslanib
 * "0%" chiqardi. */
export function shiftDay(day: string, offsetDays: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Qo'ng'iroq vaqtidan Toshkent kunini oladi: "2026-09-27T19:10:00Z" → "2026-09-28".
 * Kunlarga ajratuvchi HAR BIR joy shu yerdan o'tishi kerak — brauzer
 * vaqt mintaqasi bo'yicha ajratilsa, yarim tunga yaqin qo'ng'iroqlar
 * boshqa kunga tushib qolardi. */
export function tashkentDayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso));
}

/** Ikki kun orasidagi farq (kun): daysBetween("2026-09-27","2026-09-25") → 2. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${from}T12:00:00Z`) - Date.parse(`${to}T12:00:00Z`)) / 86400000);
}

/** Hozirgi Toshkent vaqti "HH:MM" — daily-summary?until= uchun. */
export function tashkentNowHm(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date());
}

/** "20:28" */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso));
}

/* Chromium'ning uz-UZ ICU ma'lumotida oy/hafta nomlari yo'q — Intl
 * "M09 27" va "Sun" kabi texnik shakl qaytaradi (foydalanuvchi shuni
 * ko'rgan). Shu sabab nomlar shu yerda, qo'lda. */
const UZ_MONTH_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const UZ_MONTH_LONG = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_WEEKDAY = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];

/** Toshkent bo'yicha kun/oy/hafta raqamlari — nom qo'yish uchun. */
function tashkentParts(d: Date): { day: number; month: number; weekday: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day: Number(get("day")), month: Number(get("month")), weekday: wd };
}

/** "24-sen" */
export function formatDayShort(iso: string): string {
  const { day, month } = tashkentParts(new Date(iso));
  return `${day}-${UZ_MONTH_SHORT[month - 1]}`;
}

/** "24-sentabr" — kun tanlagich chiplari uchun. */
export function formatDayMonth(day: string): string {
  const { day: d, month } = tashkentParts(new Date(`${day}T12:00:00Z`));
  return `${d}-${UZ_MONTH_LONG[month - 1]}`;
}

/** "27-sen" — grafik o'qi uchun qisqa yorliq. */
export function formatDayAxis(day: string): string {
  const { day: d, month } = tashkentParts(new Date(`${day}T12:00:00Z`));
  return `${d}-${UZ_MONTH_SHORT[month - 1]}`;
}

/** "sha", "yak" — hafta kunining qisqa nomi. */
export function formatWeekdayShort(day: string): string {
  const { weekday } = tashkentParts(new Date(`${day}T12:00:00Z`));
  return UZ_WEEKDAY[weekday].slice(0, 3);
}

/** "chorshanba, 24-sentabr" */
export function formatDayLong(day: string): string {
  const { day: d, month, weekday } = tashkentParts(new Date(`${day}T12:00:00Z`));
  return `${UZ_WEEKDAY[weekday]}, ${d}-${UZ_MONTH_LONG[month - 1]}`;
}

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

/** "24-sen" */
export function formatDayShort(iso: string): string {
  return new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, day: "2-digit", month: "short" }).format(new Date(iso));
}

/** "chorshanba, 24-sentabr" */
export function formatDayLong(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, weekday: "long" }).format(d);
  const rest = new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, day: "numeric", month: "long" }).format(d);
  return `${weekday}, ${rest}`;
}

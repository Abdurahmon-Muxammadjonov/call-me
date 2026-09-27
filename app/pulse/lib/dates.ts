/* Sana va vaqt — hammasi Asia/Tashkent (UTC+5, yozgi vaqt yo'q).
 *
 * Chromium'ning uz-UZ ICU ma'lumotida oy/hafta kuni nomlari yo'q ("M09",
 * "Sun" chiqadi), shuning uchun o'zbekcha nomlar jadvalda; rus va ingliz
 * tillari Intl'dan. Bu fayl hech narsa import qilmaydi (node --test). */

export type Loc = "uz" | "ru" | "en";

const UZ_MONTH = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_MONTH_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const UZ_WEEKDAY = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
/* Dushanbadan boshlanadi (§5.1): Du Se Ch Pa Ju Sh Ya. */
const UZ_WD_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const RU_WD_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const EN_WD_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DAY_MS = 86_400_000;
const TZ_OFFSET_MS = 5 * 3_600_000;

/* "YYYY-MM-DD" → UTC tushi (hisob-kitob uchun barqaror nuqta). */
function noonUtc(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function tashkentHourOf(now: Date = new Date()): number {
  return new Date(now.getTime() + TZ_OFFSET_MS).getUTCHours();
}

export function hmOf(now: Date = new Date()): string {
  return new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(11, 16);
}

export function addDays(day: string, n: number): string {
  return new Date(noonUtc(day).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function dayDiff(from: string, to: string): number {
  return Math.round((noonUtc(to).getTime() - noonUtc(from).getTime()) / DAY_MS);
}

/* 0 = dushanba … 6 = yakshanba. */
export function isoWeekday(day: string): number {
  return (noonUtc(day).getUTCDay() + 6) % 7;
}

export function weekStart(day: string): string {
  return addDays(day, -isoWeekday(day));
}

export function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/* O'tgan oyning shu kuni (oy qisqa bo'lsa — oxirgi kuni). */
export function sameDayPrevMonth(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const ym = `${py}-${String(pm).padStart(2, "0")}`;
  return `${ym}-${String(Math.min(d, daysInMonth(ym))).padStart(2, "0")}`;
}

export function shiftMonth(ym: string, n: number): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, "0")}`;
}

function intl(loc: Loc, day: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(loc === "ru" ? "ru-RU" : "en-GB", { timeZone: "UTC", ...opts }).format(noonUtc(day));
}

export function monthName(loc: Loc, month1: number, form: "long" | "short" = "long"): string {
  if (loc === "uz") return (form === "long" ? UZ_MONTH : UZ_MONTH_SHORT)[month1 - 1];
  const d = `2026-${String(month1).padStart(2, "0")}-15`;
  // Mustaqil shakl ("сентябрь"), qaratqich emas.
  return intl(loc, d, { month: form === "long" ? "long" : "short" }).replace(".", "");
}

export function weekdayName(loc: Loc, day: string): string {
  if (loc === "uz") return UZ_WEEKDAY[noonUtc(day).getUTCDay()];
  return intl(loc, day, { weekday: "long" });
}

/* Du … Ya (dushanbadan). */
export function weekdayShort(loc: Loc, isoWd: number): string {
  const sundayBased = (isoWd + 1) % 7;
  return (loc === "ru" ? RU_WD_SHORT : loc === "en" ? EN_WD_SHORT : UZ_WD_SHORT)[sundayBased];
}

/* "24-sentabr" / "24 сентября" / "24 September". */
export function dayMonth(loc: Loc, day: string): string {
  const d = Number(day.slice(8, 10));
  if (loc === "uz") return `${d}-${UZ_MONTH[Number(day.slice(5, 7)) - 1]}`;
  return intl(loc, day, { day: "numeric", month: "long" });
}

/* "24-sen" / "24 сен" / "24 Sep". */
export function dayMonthShort(loc: Loc, day: string): string {
  const d = Number(day.slice(8, 10));
  if (loc === "uz") return `${d}-${UZ_MONTH_SHORT[Number(day.slice(5, 7)) - 1]}`;
  return intl(loc, day, { day: "numeric", month: "short" }).replace(".", "");
}

/* "11–24 sentabr" yoki oy chegarasida "29-avgust – 11-sentabr". */
export function rangeLabel(loc: Loc, from: string, to: string, hyphen = false): string {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  if (sameMonth) {
    const m = monthName(loc, Number(to.slice(5, 7)));
    const sep = loc === "uz" && hyphen ? "-" : " ";
    return `${Number(from.slice(8, 10))}–${Number(to.slice(8, 10))}${sep}${loc === "uz" ? m : intl(loc, to, { month: "long", day: "numeric" }).replace(/^\d+\s*/, "")}`;
  }
  return `${dayMonth(loc, from)} – ${dayMonth(loc, to)}`;
}

/* "sentabr 2026" — sarlavha uchun (katta harf CSS bilan). */
export function monthYear(loc: Loc, day: string): string {
  return `${monthName(loc, Number(day.slice(5, 7)))} ${day.slice(0, 4)}`;
}

/* Soat:daqiqa formatidagi davomiylik: 76 620 s → "21:17". */
export function hoursMinutes(sec: number): string {
  const total = Math.max(0, Math.round(sec / 60));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

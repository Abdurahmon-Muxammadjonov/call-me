/* TEST FIXTURE — Analitika maketi (01-Analitika.png / Main.dc.html) dagi
 * namuna raqamlar. Faqat testlarda ishlatiladi, bundle'ga tushmaydi. */

export const FIXED_NOW = new Date("2026-09-24T15:40:00Z"); // Toshkent: payshanba, 24-sentabr, 20:40
export const TODAY = "2026-09-24";

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

const CALLS = [640, 410, 90, 720, 760, 705, 690, 655, 430, 85, 780, 812, 697, 1306];
const LONGS = [150, 96, 18, 170, 178, 165, 160, 152, 100, 16, 182, 190, 164, 308];
const DEALS = [3, 1, 0, 4, 5, 3, 4, 3, 2, 0, 5, 6, 4, 7];
const LEADS = [36, 22, 4, 41, 44, 39, 37, 35, 24, 3, 42, 45, 36, 48];
const OFFERS = [8, 5, 1, 9, 10, 8, 9, 8, 5, 1, 9, 10, 8, 11];

export const HOURLY = [48, 96, 132, 121, 88, 79, 95, 112, 126, 158, 171, 80]; // 09:00–20:00
/* Solishtirish maketi: kechagi soatlik (09:00–23:00). */
export const HOURLY_YESTERDAY = [26, 50, 68, 62, 46, 40, 50, 58, 64, 80, 86, 44, 14, 6, 3];
export const YESTERDAY = addDays(TODAY, -1);

function row(date: string, i: number) {
  const calls = CALLS[i] ?? 0;
  return {
    date,
    calls,
    minutes: i === 13 ? 21 * 60 + 17 : i === 12 ? 699 : Math.round(calls * 0.95),
    analyzed: calls,
    scored: Math.round(calls * 0.25),
    avg_score: i === 13 ? 34 : i === 12 ? 35 : 36,
    low_score: i === 13 ? 41 : 20,
    long_calls: LONGS[i] ?? 0,
    operator_calls: calls,
    penalty_sum: 0,
    bonus_sum: 0,
    incoming: i === 13 ? 202 : Math.round(calls * 0.15),
    outgoing: i === 13 ? 1104 : calls - Math.round(calls * 0.15),
    leads: LEADS[i] ?? 0,
    invited: OFFERS[i] ?? 0,
    closed: DEALS[i] ?? 0,
    bad_leads: 0,
    unanswered: 0,
  };
}

/* days=N: so'nggi N kun, yangidan eskiga (v1 tartibi). */
export function dailySummary(days: number, until: string | null) {
  const out = [];
  for (let k = 0; k < days; k++) {
    const date = addDays(TODAY, -k);
    const i = 13 - k;
    if (i >= 0) {
      const r = row(date, i);
      // "until" — kechaning shu vaqtigacha (maketda 697, lidlar 36).
      out.push(until && k === 1 ? { ...r, calls: 697, leads: 36, invited: 8, closed: 6 } : r);
    } else {
      out.push({ ...row(date, 0), calls: 500, long_calls: 100, leads: 20, invited: 5, closed: 2 });
    }
  }
  return out;
}

export function hourly(date: string | null = TODAY) {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    calls:
      date === TODAY ? (h >= 9 && h <= 20 ? HOURLY[h - 9] : 0)
      : date === YESTERDAY ? (h >= 9 && h <= 23 ? HOURLY_YESTERDAY[h - 9] : 0)
      : 0,
    operator_calls: 0,
    long_calls: 0,
    analyzed: 0,
    talk_seconds: 0,
  }));
}

/* [ext, qo'ng'iroq, uzun, kiruvchi, chiquvchi, lid, ball] — maketdagi jamoa +
 * norma banneridagi orqada qolganlar (5200, 110, 109). */
export const TEAM: Array<[string, number, number, number, number, number, number]> = [
  ["102", 109, 44, 15, 94, 10, 4.2],
  ["108", 214, 41, 40, 174, 9, 3.5],
  ["104", 229, 38, 31, 198, 6, 3.6],
  ["106", 100, 33, 18, 82, 5, 4.3],
  ["107", 109, 30, 20, 89, 4, 3.1],
  ["105", 132, 29, 18, 114, 8, 2.4],
  ["103", 58, 20, 8, 50, 2, 3.9],
  ["101", 49, 18, 6, 43, 1, 3.3],
  ["100", 149, 16, 22, 127, 2, 2.3],
  ["109", 44, 14, 5, 39, 1, 3.0],
  ["110", 72, 12, 10, 62, 0, 2.8],
  ["5200", 41, 6, 3, 38, 0, 2.6],
];

export function todayCalls() {
  const calls = [];
  let seq = 0;
  for (const [ext, n, long, inc, , lid, score] of TEAM) {
    for (let j = 0; j < n; j++) {
      seq++;
      calls.push({
        id: `c${seq}`,
        manager_id: "unmapped",
        audio_url: "",
        duration: j < long ? 95 : 25,
        kpi_score: Math.round(score * 10),
        penalty_amount: 0,
        bonus_amount: 0,
        rop_comment: "",
        operator_ext: ext,
        direction: j < inc ? "incoming" : "outgoing",
        new_leads_count: j < lid ? 1 : 0,
        created_at: `${TODAY}T0${(j % 9) + 1}:00:00+05:00`,
      });
    }
  }
  return calls;
}

/* Solishtirish › "Kim o'sdi, kim tushdi": kechagi ballar (bugungisi TEAM da). */
export const SCORE_YESTERDAY: Record<string, number> = {
  "102": 4.0, "106": 4.5, "103": 3.6, "104": 3.9, "108": 4.1, "101": 3.2,
  "107": 3.3, "109": 3.2, "110": 3.0, "105": 2.8, "100": 2.9, "5200": 2.4,
};

export function yesterdayCalls() {
  const calls = [];
  let seq = 0;
  for (const [ext, score] of Object.entries(SCORE_YESTERDAY)) {
    for (let j = 0; j < 20; j++) {
      seq++;
      calls.push({
        id: `y${seq}`,
        manager_id: "unmapped",
        audio_url: "",
        duration: 70,
        kpi_score: Math.round(score * 10),
        penalty_amount: 0,
        bonus_amount: 0,
        rop_comment: "",
        operator_ext: ext,
        direction: "outgoing",
        new_leads_count: 0,
        created_at: `${YESTERDAY}T10:00:00+05:00`,
      });
    }
  }
  return calls;
}

/* /analytics/daily-minutes — bugun operatorlar kesimi (maketdagi to'rttasi). */
export function dailyMinutes(days: number) {
  const out = [];
  const rows = dailySummary(days, null);
  for (let k = 0; k < days; k++) {
    const date = addDays(TODAY, -k);
    const r = rows[k];
    out.push({
      date,
      calls: r.calls,
      seconds: r.minutes * 60,
      minutes: r.minutes,
      operators: k === 0
        ? [
            { name: "104", calls: 229, minutes: 204 },
            { name: "108", calls: 214, minutes: 204 },
            { name: "102", calls: 109, minutes: 163 },
            { name: "107", calls: 109, minutes: 121 },
          ]
        : [],
    });
  }
  return out;
}

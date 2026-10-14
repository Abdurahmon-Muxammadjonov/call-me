/* Xodimlar statistikasi hisoblari (2026-10-14) — SOF funksiyalar.
 * avg_score serverda 0–100 (faqat baholangan qo'ng'iroqlar); UI 10 ballik. */

import type { StaffRow } from "../../data/staff";
import type { OperatorDay } from "../../data/dayCalls";

export function score10(r: Pick<StaffRow, "scored_calls" | "avg_score"> | undefined): number | null {
  if (!r || !r.scored_calls) return null;
  return Math.round(r.avg_score) / 10;
}

export function extOf(r: Pick<StaffRow, "key" | "name">): string | null {
  if (r.key.startsWith("ext:")) return r.key.slice(4);
  const m = r.name.match(/(\d{2,5})\s*$/);
  return m ? m[1] : null;
}

/* Operator kesimi (uzun / norma, kiruvchi) bilan bog'lash: ichki raqam
 * bo'yicha, bo'lmasa ism bo'yicha. */
export function opDayOf(r: StaffRow, ops: OperatorDay[] | undefined): OperatorDay | undefined {
  if (!ops) return undefined;
  const ext = r.key.startsWith("ext:") ? r.key.slice(4) : null;
  return (ext ? ops.find((o) => o.ext === ext || o.key === ext) : undefined) ?? ops.find((o) => o.name === r.name || o.key === r.key);
}

export interface Ranked extends StaffRow {
  rank: number;
  s10: number | null;
  ext: string | null;
}

export function ranked(rows: StaffRow[]): Ranked[] {
  return [...rows]
    .map((r) => ({ ...r, s10: score10(r), ext: extOf(r), rank: 0 }))
    .sort((a, b) => (b.s10 ?? -1) - (a.s10 ?? -1) || b.calls - a.calls || a.key.localeCompare(b.key))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/* Jamoa o'rtachasi — baholangan qo'ng'iroqlar soniga og'irlangan. */
export function teamAvg(rows: StaffRow[]): number | null {
  let s = 0;
  let n = 0;
  for (const r of rows) {
    if (!r.scored_calls) continue;
    s += r.avg_score * r.scored_calls;
    n += r.scored_calls;
  }
  return n ? Math.round(s / n) / 10 : null;
}

export function avgDurationSec(r: Pick<StaffRow, "minutes" | "calls">): number | null {
  return r.calls ? (r.minutes * 60) / r.calls : null;
}

/* OPERATORLAR DOIM KO'RINADI (foydalanuvchi talabi 2026-10-15: "operatorlar
 * yo'q bo'lib qoldi, ular har doim tursin, o'chirib tashlama").
 *
 * Kunlik kesimlar (/analytics/operators, /analytics/staff-stats) faqat o'sha
 * kuni qo'ng'iroq qilgan operatorlarni qaytaradi — qo'ng'iroqsiz kun yoki
 * tunda ro'yxat bo'shab, operatorlar "yo'qolgandek" ko'rinardi. Endi
 * kompaniyaning doimiy ro'yxati (/managers) asos: har bir operator har
 * doim turadi, o'sha kuni qo'ng'iroq qilmagan bo'lsa — nol ko'rsatkich bilan.
 * Ro'yxatda yo'q, lekin o'sha kuni qo'ng'iroq qilgan raqam ham tushib
 * qolmaydi (oxiriga qo'shiladi). */

import type { OperatorDay } from "./dayCalls";
import type { StaffRow } from "./staff";

export interface RosterManager {
  id: string;
  name: string;
}

/* "Operator 105" -> "105". Ism raqam bilan tugamasa — null. */
export function extFromName(name: string): string | null {
  const m = String(name || "").match(/(\d{2,6})\s*$/);
  return m ? m[1] : null;
}

const norm = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();

/* Kunlik operator kesimi + doimiy ro'yxat. Tartib: avval o'sha kuni
 * qo'ng'iroq qilganlar (ko'pi birinchi), keyin qo'ng'iroqsizlar (raqam
 * bo'yicha). Kalitsiz ("—") qatorlar o'zgarishsiz qoladi. */
export function withRosterOps(rows: OperatorDay[], managers: RosterManager[] | undefined): OperatorDay[] {
  const out = [...rows];
  for (const m of managers ?? []) {
    const ext = extFromName(m.name);
    const found = out.some((o) => (ext && (o.ext === ext || o.key === ext)) || (o.name && norm(o.name) === norm(m.name)));
    if (found) continue;
    out.push({
      key: ext ?? `m:${m.id}`,
      ext,
      name: m.name,
      calls: 0,
      longCalls: 0,
      incoming: 0,
      outgoing: 0,
      leads: null,
      score10: null,
      scored: 0,
      talkSec: 0,
    });
  }
  return out.sort((a, b) => b.calls - a.calls || (a.ext ?? a.key).localeCompare(b.ext ?? b.key, undefined, { numeric: true }));
}

/* Xodimlar statistikasi qatorlari + doimiy ro'yxat (qo'ng'iroqsizlar nol bilan). */
export function withRosterStaff(rows: StaffRow[], managers: RosterManager[] | undefined): StaffRow[] {
  const out = [...rows];
  for (const m of managers ?? []) {
    const ext = extFromName(m.name);
    const found = out.some((r) => (ext && (r.key === `ext:${ext}` || extFromName(r.name) === ext)) || norm(r.name) === norm(m.name));
    if (found) continue;
    out.push({
      key: ext ? `ext:${ext}` : `m:${m.id}`,
      name: m.name,
      calls: 0,
      minutes: 0,
      scored_calls: 0,
      avg_score: 0,
      stages: [],
      faults: [],
      advice: [],
      reasons: [],
      leads: 0,
      invited: 0,
      closed: 0,
      conversion: 0,
      problems: 0,
      top_mistakes: [],
      lost_reasons: [],
    });
  }
  return out;
}

/* Xato -> yechim (2026-10-15). AI izohidagi xato "Bosqich nomi: nima
 * qilinmadi" ko'rinishida; yechim — kompaniya skriptidagi (baholash
 * mezonlari) o'sha bosqichning qoidasi, ya'ni AI aynan nimani kutgani.
 * Skript ikki xil bo'lishi mumkin (masalan "Skript: Eski baza" va
 * "Skript: Yangi lid") — qo'ng'iroq turi bo'yicha mos skript afzal. */

export interface GuideCriterion {
  title: string;
  description: string;
  category: string | null;
}

/* "1. Salomlashish va POVOD (qo'ng'iroq sababi)" -> "salomlashish va povod" */
export function stageCore(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[‘’ʻʼ`']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX = 420;

export function solutionFor(mistake: string, newLead: boolean, criteria: GuideCriterion[]): string | null {
  const head = mistake.includes(":") ? mistake.slice(0, mistake.indexOf(":")) : mistake;
  const core = stageCore(head);
  if (!core) return null;
  const scored = criteria
    .map((c) => {
      const cc = stageCore(c.title);
      const exact = cc === core;
      const partial = !exact && cc.length > 3 && (cc.startsWith(core) || core.startsWith(cc));
      if (!exact && !partial) return null;
      const cat = (c.category || "").toLowerCase();
      const typeOk = newLead ? /yangi|new/.test(cat) : /eski|old|qayta/.test(cat);
      return { c, rank: (exact ? 2 : 0) + (typeOk ? 1 : 0) };
    })
    .filter((x): x is { c: GuideCriterion; rank: number } => !!x)
    .sort((a, b) => b.rank - a.rank);
  const best = scored[0]?.c;
  if (!best?.description?.trim()) return null;
  const text = best.description.replace(/\s+/g, " ").trim();
  return text.length > MAX ? `${text.slice(0, MAX - 1).trimEnd()}…` : text;
}

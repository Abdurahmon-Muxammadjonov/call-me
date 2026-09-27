/* Aksent ranglari (spetsifikatsiya §4.3).
 *
 * `accentVars()` manbadagi `acc(hex)` funksiyasining aynan ko'chirmasi
 * (design/pulse-noir/source/Nav.dc.html): siyoh rangi WCAG yorqinligi
 * bo'yicha #101114 yoki #FFFFFF tanlanadi, qolgan tuslar shu ranglarning
 * alfa variantlari. Kompaniya faqat PRESET kalitini tanlaydi.
 *
 * Bu fayl ataylab hech narsa import qilmaydi — root layout'dagi
 * bo'yashdan-oldingi skript ham, `node --test` ham uni to'g'ridan-to'g'ri
 * ishlata olsin. */

export type AccentKey = "lime" | "blue" | "coral" | "violet";

export const ACCENT_KEYS: readonly AccentKey[] = ["lime", "blue", "coral", "violet"];

export const DEFAULT_ACCENT: AccentKey = "lime";

/* `strongLight` — yorug' mavzuda aksent MATN/CHIZIQ/CHEGARA sifatida
 * ishlatilganda (§4.3 "Light-theme rule"). Qorong'ida u aksentning o'zi. */
export const ACCENT_PRESETS: Record<AccentKey, { hex: string; strongLight: string }> = {
  lime: { hex: "#D4F570", strongLight: "#5A7A00" },
  blue: { hex: "#6E9BFF", strongLight: "#2F5FD0" },
  coral: { hex: "#FF8A5C", strongLight: "#C2410C" },
  violet: { hex: "#B19CFF", strongLight: "#6D4FD8" },
};

export function isAccentKey(v: unknown): v is AccentKey {
  return typeof v === "string" && (ACCENT_KEYS as readonly string[]).includes(v);
}

/* acc() dagi kabi: noto'g'ri hex bo'lsa laym (212, 245, 112) ga qaytadi. */
export function parseHex(hex: string): [number, number, number] {
  const h = String(hex || "").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return [212, 245, 112];
  return [r, g, b];
}

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/* acc(): `dark = (L + 0.05) / 0.0556 >= 1.05 / (L + 0.05)` — ya'ni #101114
 * bilan kontrast oq bilan kontrastdan kam emas bo'lsa, siyoh to'q. */
export function accentInk(hex: string): "#101114" | "#FFFFFF" {
  const [r, g, b] = parseHex(hex);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const dark = (L + 0.05) / 0.0556 >= 1.05 / (L + 0.05);
  return dark ? "#101114" : "#FFFFFF";
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* <html style> ga yoziladigan CSS o'zgaruvchilari. `--pn-accent-strong`
 * mavzuga bog'liq, shuning uchun bu yerda ikkala variant beriladi va
 * tokens.css mavzuga qarab keraklisini tanlaydi. */
export function accentVars(key: AccentKey): Record<string, string> {
  const { hex, strongLight } = ACCENT_PRESETS[key] ?? ACCENT_PRESETS[DEFAULT_ACCENT];
  const rgb = parseHex(hex);
  const ink = accentInk(hex);
  const inkRgb = parseHex(ink);
  return {
    "--pn-accent": hex,
    "--pn-accent-ink": ink,
    "--pn-accent-soft": rgba(rgb, 0.14),
    "--pn-accent-area": rgba(rgb, 0.12),
    "--pn-accent-ring": rgba(rgb, 0.16),
    "--pn-on-accent-muted": rgba(inkRgb, 0.68),
    "--pn-on-accent-dim": rgba(inkRgb, 0.22),
    "--pn-on-accent-faint": rgba(inkRgb, 0.12),
    /* Faol menyu bandidagi hisoblagich foni (Nav.dc.html: siyoh 14%). */
    "--pn-on-accent-badge": rgba(inkRgb, 0.14),
    "--pn-accent-strong-dark": hex,
    "--pn-accent-strong-light": strongLight,
  };
}

/* =====================================================================
 * CSV EKSPORT.
 *
 * Excel'ning o'zbek/rus lokalida to'g'ri ochilishi uchun:
 *   • UTF-8 BOM (aks holda kirill va o'zbek harflari buziladi)
 *   • ";" ajratuvchi (vergul lokalda kasr belgisi hisoblanadi)
 * ===================================================================== */

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

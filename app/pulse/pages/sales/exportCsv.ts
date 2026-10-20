"use client";

/* Sotuv dashboardini Excel'ga (CSV, UTF-8 BOM, ";" ajratgich — Excel
 * o'zbek/rus sozlamasida to'g'ri ochadi). Bo'limlar: KPI, menejerlar,
 * manbalar, voronka, qarzdorlik, oylar taqqoslash. */

import type { PT } from "../../i18n";
import { wOk, type SalesData } from "../../data/sales";

type Live = Extract<SalesData, { connected: true }>;

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildSalesCsv(d: Live, t: PT): string {
  const L: unknown[][] = [];
  const w = d.widgets;
  L.push([t("sd.title"), `${d.meta.range.from} – ${d.meta.range.to}`]);
  L.push([]);
  const k = wOk(w.kpis);
  if (k) {
    L.push([t("sd.w.kpis")]);
    L.push([t("sd.k.month"), k.month.value, k.month.prev]);
    L.push([t("sd.k.today"), k.today.value, k.today.prev]);
    L.push([t("sd.k.salesCount"), k.salesCount.value, k.salesCount.prev]);
    L.push([t("sd.cmp.sales"), k.salesSum.value, k.salesSum.prev]);
    L.push([t("sd.launch.paid"), k.paid.value, k.paid.prev]);
    L.push([t("sd.k.newClients"), k.newClients.value, k.newClients.prev]);
    L.push([t("sd.m.leads"), k.leads.value, k.leads.prev]);
    L.push([t("sd.k.conversion"), k.conversion.value, k.conversion.prev]);
    L.push([t("sd.k.avgCheck"), k.avgCheck.value, k.avgCheck.prev]);
    L.push([]);
  }
  const m = wOk(w.managers);
  if (m) {
    L.push([t("sd.w.managers")]);
    L.push([t("sd.m.manager"), t("sd.m.leads"), t("sd.m.inWork"), t("sd.m.sales"), t("sd.m.sum"), t("sd.m.conv"), t("sd.m.avg"), t("sd.m.talk"), t("sd.m.oldest")]);
    for (const r of [...m.rows, ...m.system.rows]) L.push([r.name, r.leads, r.inWork, r.sales, r.sum, r.conv, r.avg, r.talkSec != null ? Math.round(r.talkSec / 60) : "", r.oldestDays]);
    L.push([]);
  }
  const s = wOk(w.sources);
  if (s) {
    L.push([t("sd.w.sources")]);
    for (const r of s.leads) L.push([r.name, r.leads, r.share, r.sales, r.sum]);
    L.push([]);
  }
  const f = wOk(w.funnel);
  if (f) {
    L.push([t("sd.w.funnel")]);
    for (const r of f.rows) L.push([r.name, r.leads, r.share, r.sales ?? ""]);
    L.push([]);
  }
  const db = wOk(w.debt);
  if (db) {
    L.push([t("sd.w.debt"), db.total]);
    for (const r of db.managers) L.push([r.name, r.sum, r.count]);
    L.push([]);
  }
  const c = wOk(w.comparison);
  if (c) {
    L.push([t("sd.w.comparison")]);
    for (const r of c.rows) L.push([r.month, r.value, r.growth.pct]);
  }
  return "﻿" + L.map((r) => r.map(cell).join(";")).join("\r\n");
}

export function exportSalesCsv(d: Live, t: PT): void {
  const blob = new Blob([buildSalesCsv(d, t)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sotuv-${d.meta.range.from}_${d.meta.range.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

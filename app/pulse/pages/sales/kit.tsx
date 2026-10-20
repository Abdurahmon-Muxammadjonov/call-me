"use client";

/* Sotuv dashboardi — umumiy qismlar (2026-10-20): vidjet kartasi (yuklanish /
 * xato / bo'sh holat o'zida), sanab chiquvchi raqam, o'sib chiquvchi chiziq,
 * toifa ranglari va so'm formatlari. Harakat — prefers-reduced-motion'da yo'q. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { usePT, type PT } from "../../i18n";
import { Icon, type IconName } from "../../ui/Icon";
import { Skeleton } from "../../ui/primitives";
import { TONE_VARS, type Tone } from "../../lib/tones";
import { fmtInt } from "../../lib/format";
import type { Growth } from "../../data/sales";

/* Toifa ranglari — qat'iy tartib: manba donut va kanallarda bir xil rangda. */
export const PALETTE = ["#EC4899", "#60A5FA", "#34D399", "#FACC15", "#A855F7", "#0EA5E9", "#84CC16", "#EF4444", "#94A3B8"];
export const colorOf = (order: string[], name: string) => PALETTE[Math.max(0, order.indexOf(name)) % PALETTE.length];

/* 766 221 975 → "766,2 mln" */
export function shortSum(t: PT, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} ${t("cm.bn")}`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")} ${t("cm.mn")}`;
  if (a >= 1e4) return `${(v / 1e3).toFixed(0)} ${t("sd.k")}`;
  return fmtInt(v);
}
export const sumText = (t: PT, v: number | null | undefined) => (v == null ? "—" : `${fmtInt(v)} ${t("cm.som")}`);
export const pctText = (v: number | null | undefined) => (v == null ? "—" : `${String(v).replace(".", ",")}%`);

/* "15с 46м · 234" → uz: "15 s 46 daq · 234" */
export function talkText(t: PT, sec: number | null, calls: number | null): string {
  if (sec == null || calls == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h ? `${h}${t("sd.h")} ` : ""}${m}${t("sd.m")} · ${fmtInt(calls)}`;
}

/* O'sish qatori: asos 0 — "—"; juda kichik asosda katta foiz o'rniga farq. */
export function GrowthLine({ g, money, t }: { g: Growth | null | undefined; money?: boolean; t: PT }) {
  if (!g) return null;
  const huge = g.pct != null && Math.abs(g.pct) > 500;
  if (g.pct == null || huge) {
    if (!g.abs) return <span className="text-pn-subtle">—</span>;
    const up = g.abs > 0;
    return (
      <span className="pn-mono" style={{ color: up ? TONE_VARS.good.text : TONE_VARS.bad.text }}>
        {up ? "▲" : "▼"} {up ? "+" : "−"}{money ? shortSum(t, Math.abs(g.abs)) : fmtInt(Math.abs(g.abs))}
      </span>
    );
  }
  const up = g.pct >= 0;
  return (
    <span className="pn-mono" style={{ color: up ? TONE_VARS.good.text : TONE_VARS.bad.text }}>
      {up ? "▲" : "▼"} {String(Math.abs(g.pct)).replace(".", ",")}%
    </span>
  );
}

/* 0 dan qiymatgacha sanaydi (600 ms); qiymat o'zgarsa oldingisidan. */
export function CountUp({ value, format }: { value: number | null; format: (v: number) => string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce || value == null ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (value == null) return;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- harakatsiz rejim: darhol
      setShown(value);
      return;
    }
    const c = animate(from.current, value, { duration: 0.6, ease: "easeOut", onUpdate: (v) => setShown(v) });
    from.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <>{value == null ? "—" : format(shown ?? 0)}</>;
}

/* Gorizontal chiziq: 0 dan qiymatgacha o'sadi. */
export function Bar({ pct, color, i = 0, h = 8 }: { pct: number; color: string; i?: number; h?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block w-full overflow-hidden rounded-full bg-pn-panel-3" style={{ height: h }}>
      <motion.span
        className="block h-full rounded-full"
        style={{ background: color }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut", delay: reduce ? 0 : Math.min(i, 12) * 0.03 }}
      />
    </span>
  );
}

export function IconTile({ icon, color }: { icon: IconName; color: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      <Icon name={icon} size={16} />
    </span>
  );
}

export function ScopeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide" style={{ background: "color-mix(in srgb, #3B82F6 12%, transparent)", color: "#60A5FA" }}>
      {children}
    </span>
  );
}

export const ACCENTS: Record<string, string> = {
  money: "#22C55E", debt: "#F05252", funnel: "#60A5FA", chart: "#3B82F6", field: "#A855F7", compare: "#0EA5E9",
  quick: "#FACC15", lost: "#EC4899", source: "#34D399", team: "#60A5FA", ads: "#F59E0B", ai: "#A855F7", launch: "#F05252", idea: "#EC4899",
};

/* Vidjet kartasi: sarlavha + ikonka + ko'lam belgisi + sozlash tugmasi;
 * holatlar (yuklanish / xato / bo'sh) shu yerda — bitta vidjet yiqilsa
 * sahifa buzilmaydi. */
export function WidgetCard({
  id, title, icon, accent, scope, footnote, actions, loading, error, empty, children, onSettings, index = 0,
}: {
  id: string; title: ReactNode; icon: IconName; accent: string; scope?: string; footnote?: ReactNode; actions?: ReactNode;
  loading?: boolean; error?: boolean; empty?: ReactNode; children?: ReactNode; onSettings?: () => void; index?: number;
}) {
  const t = usePT();
  const reduce = useReducedMotion();
  return (
    <motion.section
      data-testid={`SD-${id}`}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: reduce ? 0 : Math.min(index, 16) * 0.04 }}
      className="@container/w flex h-full min-w-0 flex-col rounded-[14px] border border-pn-border bg-pn-panel transition-colors hover:border-pn-border-3"
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span style={{ color: accent }}><Icon name={icon} size={16} /></span>
          <h2 className="truncate text-[15px] font-semibold">{title}</h2>
          {scope && <ScopeBadge>{scope}</ScopeBadge>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onSettings && (
            <button type="button" onClick={onSettings} aria-label={t("sd.widgetSettings")} className="pn-press grid h-7 w-7 place-items-center rounded-full text-pn-subtle hover:bg-pn-panel-2 hover:text-pn-text">
              <Icon name="layers" size={14} />
            </button>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">
        {loading ? <Skeleton h={140} r={12} /> : error ? (
          <p className="flex items-center gap-2 text-[13px]" style={{ color: TONE_VARS.bad.text }}><Icon name="warning" size={14} />{t("sd.widgetError")}</p>
        ) : empty ? <p className="text-[13px] text-pn-muted">{empty}</p> : children}
      </div>
      {footnote && !loading && !error && <p className="border-t border-pn-border-2 px-5 py-2 text-[11px] text-pn-subtle">{footnote}</p>}
    </motion.section>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-[12px] text-pn-subtle">{children}</span>;
}

export function Info({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const v = TONE_VARS[tone];
  return <p className="mb-3 rounded-xl px-3 py-2 text-[12px]" style={{ background: v.tint, color: v.text }}>{children}</p>;
}

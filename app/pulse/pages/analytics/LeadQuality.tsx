"use client";

/* LID SIFATI — Dashboard ichida (2026-10-16, foydalanuvchi talabi: "lidni
 * sifatli/sifatsizga ajratish va nega — sababi"). Davr — Analitikaning
 * tanlangan oralig'i (Kun / Hafta / Oy + Sana). Sabab bosilsa — shu sababli
 * oxirgi qo'ng'iroqlar; qo'ng'iroq bosilsa — Audio yozuvlarda ochiladi. */

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Card, ExtBadge, Skeleton, StatusPill } from "../../ui/primitives";
import { useLeadQuality } from "../../data/leadQuality";
import { TONE_VARS } from "../../lib/tones";
import { fmtInt } from "../../lib/format";
import { dayMonth, hmOf, tashkentToday, type Loc } from "../../lib/dates";

export function LeadQualityCard({ from, to }: { from: string; to: string }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const q = useLeadQuality(from, to);
  const [reason, setReason] = useState<string | null>(null);
  const d = q.data;
  const total = d ? d.qualified + d.unqualified : 0;
  const goodPct = total ? Math.round((d!.qualified / total) * 100) : 0;
  const maxReason = Math.max(1, ...(d?.reasons ?? []).map((r) => r.count));
  const list = (d?.recent_unqualified ?? []).filter((c) => !reason || c.reasons.includes(reason));
  const today = tashkentToday();

  return (
    <Card pad="none" className="@container/lq overflow-hidden" data-testid="AN-LEADQ">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-[22px] pb-4">
        <div>
          <h2 className="pn-card-title">{t("lq.title")}</h2>
          <p className="pn-card-sub">{from === to ? dayMonth(loc, from) : `${dayMonth(loc, from)} – ${dayMonth(loc, to)}`} · {t("lq.sub")}</p>
        </div>
        {d && (
          <div className="flex items-center gap-2">
            <StatusPill tone="good">{t("lq.qualified", { n: fmtInt(d.qualified) })}</StatusPill>
            <StatusPill tone="bad">{t("lq.unqualified", { n: fmtInt(d.unqualified) })}</StatusPill>
          </div>
        )}
      </div>

      {q.isPending ? (
        <div className="px-6 pb-6"><Skeleton h={180} r={18} /></div>
      ) : q.isError ? (
        <div className="px-6 pb-6 text-[14px] text-pn-muted">{t("lq.error")}</div>
      ) : !d || total === 0 ? (
        <div className="px-6 pb-6 text-[14px] text-pn-muted">{t("lq.empty")}</div>
      ) : (
        <div className="flex flex-col gap-5 px-6 pb-6">
          {/* Nisbat chizig'i */}
          <div>
            <div className="mb-2 flex justify-between text-[12px] text-pn-muted">
              <span style={{ color: TONE_VARS.good.text }}>{t("lq.goodShare", { p: goodPct })}</span>
              <span style={{ color: TONE_VARS.bad.text }}>{t("lq.badShare", { p: 100 - goodPct })}</span>
            </div>
            <div className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
              <span className="h-full rounded-l-full" style={{ flexGrow: Math.max(d.qualified, 0.01), background: TONE_VARS.good.fg }} />
              <span className="h-full rounded-r-full" style={{ flexGrow: Math.max(d.unqualified, 0.01), background: TONE_VARS.bad.fg }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 @min-[900px]/lq:grid-cols-[1.1fr_1fr]">
            {/* Sabablar */}
            <div>
              <p className="pn-section-label mb-3 text-pn-muted">{t("lq.why")}</p>
              <ul className="flex flex-col gap-2">
                {d.reasons.map((r) => {
                  const on = reason === r.reason;
                  return (
                    <li key={r.reason}>
                      <button
                        type="button"
                        onClick={() => setReason(on ? null : r.reason)}
                        aria-pressed={on}
                        className={`pn-press w-full rounded-2xl px-3 py-2 text-left ${on ? "bg-pn-panel-3" : "hover:bg-pn-panel-2"}`}
                        data-testid={`AN-LEADQ-r-${r.reason}`}
                      >
                        <span className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                          <span className="min-w-0 truncate text-pn-text-2">{r.reason}</span>
                          <span className="pn-mono shrink-0 text-pn-text">{fmtInt(r.count)} · {Math.round((r.count / d.unqualified) * 100)}%</span>
                        </span>
                        <span className="block h-[5px] overflow-hidden rounded-full bg-pn-panel-3">
                          <span className="block h-full rounded-full" style={{ width: `${(r.count / maxReason) * 100}%`, background: TONE_VARS.bad.fg }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Operatorlar kesimi */}
            <div>
              <p className="pn-section-label mb-3 text-pn-muted">{t("lq.byOperator")}</p>
              <ul className="flex flex-col gap-2">
                {d.operators.slice(0, 8).map((o) => {
                  const n = o.qualified + o.unqualified;
                  return (
                    <li key={o.ext ?? o.name} className="flex items-center gap-3 rounded-2xl bg-pn-panel-2 px-3 py-2">
                      {o.ext && <ExtBadge size="audio">{o.ext}</ExtBadge>}
                      <span className="min-w-0 flex-1 truncate text-[13px]">{o.name}</span>
                      <span className="flex h-[6px] w-20 shrink-0 overflow-hidden rounded-full bg-pn-panel-3" aria-hidden>
                        <span style={{ width: `${n ? (o.qualified / n) * 100 : 0}%`, background: TONE_VARS.good.fg }} />
                        <span style={{ width: `${n ? (o.unqualified / n) * 100 : 0}%`, background: TONE_VARS.bad.fg }} />
                      </span>
                      <span className="pn-mono w-16 shrink-0 text-right text-[12px]">
                        <span style={{ color: TONE_VARS.good.text }}>{o.qualified}</span> / <span style={{ color: TONE_VARS.bad.text }}>{o.unqualified}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Oxirgi sifatsiz lidlar */}
          <div>
            <p className="pn-section-label mb-3 text-pn-muted">{reason ? t("lq.recentFor", { r: reason }) : t("lq.recent")}</p>
            {list.length === 0 ? (
              <p className="text-[13px] text-pn-muted">{t("lq.noRecent")}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 @min-[900px]/lq:grid-cols-2">
                {list.slice(0, 8).map((c) => {
                  const day = c.created_at.slice(0, 10);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/recordings?${day === today ? "" : `date=${day}&`}open=${c.id}`}
                        className="pn-press flex flex-col gap-1 rounded-2xl border border-pn-border-2 px-4 py-3 hover:border-pn-border-3"
                      >
                        <span className="flex items-center gap-2 text-[13px]">
                          <span className="font-semibold">{c.name ?? "—"}</span>
                          <span className="pn-mono text-[12px] text-pn-subtle">{dayMonth(loc, day)} {hmOf(new Date(c.created_at))}</span>
                        </span>
                        <span className="flex flex-wrap gap-1">{c.reasons.map((r) => <StatusPill key={r} tone="bad" plain>{r}</StatusPill>)}</span>
                        {c.summary && <span className="line-clamp-2 text-[12px] text-pn-muted">{c.summary}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

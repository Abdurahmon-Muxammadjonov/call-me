"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { fetchDailySummary, fetchStaffStats, type StaffStatRow } from "../lib/api";
import { fetchCompanySettings, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "../lib/companySettings";
import { useSession } from "../lib/auth";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import { formatMinutes, formatNumber, formatScore, normalizeScore, percentTone, scoreGrade, tashkentDay } from "../lib/format";
import {
  Card, CardHeader, DateChips, EmptyState, PageHeader, PrimaryButton,
  ProgressBar, SecondaryButton, Skeleton, Sparkline, TONE,
} from "./kit";

/* =====================================================================
 * XODIMLAR STATISTIKASI (spetsifikatsiya 3.4)
 *
 * Ball taqsimoti (0–10 shkala, uch zona) + operatorlar ro'yxati. Qator
 * ochilganda uch blok: aybi, tuzatish yo'li, skript bandlari.
 * ===================================================================== */

const SCORE_TONE = { excellent: "green", good: "amber", average: "amber", low: "orange" } as const;

function scoreColorOf(score: number): string {
  const g = scoreGrade(score);
  return g ? TONE[SCORE_TONE[g]].color : "var(--subtle)";
}

/** 3.4 A — ball taqsimoti. */
function Distribution({ rows, goal }: { rows: StaffStatRow[]; goal: number }) {
  const t = useT();
  const scores = rows.map((r) => normalizeScore(r.avg_score)).filter((v): v is number => v !== null);
  if (scores.length === 0) return null;

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const pos = (v: number) => `${(v / 10) * 100}%`;

  return (
    <Card>
      <CardHeader
        title={t("st.dist.title")}
        right={
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>
            {t("st.dist.range", {
              min: min.toFixed(1), max: max.toFixed(1), goal: goal.toFixed(1),
            })}
          </span>
        }
      />
      <div className="relative mt-5" style={{ height: 56 }}>
        {/* Uch zona */}
        <div className="absolute inset-x-0 top-1/2 flex h-3 -translate-y-1/2 overflow-hidden rounded-md" aria-hidden>
          <span style={{ width: "50%", background: "rgba(251,146,60,0.16)" }} />
          <span style={{ width: "30%", background: "rgba(250,204,21,0.12)" }} />
          <span style={{ width: "20%", background: "rgba(74,222,154,0.14)" }} />
        </div>

        {/* Maqsad */}
        <span className="absolute top-0 h-full" style={{ left: pos(goal), borderLeft: "2px dashed var(--green)" }} aria-hidden />
        <span className="absolute -top-1 font-mono text-[11px]" style={{ left: pos(goal), transform: "translateX(-50%)", color: "var(--green)" }}>
          {t("st.dist.goal", { v: goal.toFixed(1) })}
        </span>

        {/* Jamoa o'rtachasi */}
        <span className="absolute top-0 h-full" style={{ left: pos(avg), borderLeft: "2px solid var(--text)" }} aria-hidden />
        <span className="absolute -top-1 font-mono text-[11px]" style={{ left: pos(avg), transform: "translateX(-50%)", color: "var(--text)" }}>
          {t("st.dist.avg", { v: avg.toFixed(1) })}
        </span>

        {/* Operatorlar */}
        {rows.map((r) => {
          const v = normalizeScore(r.avg_score);
          if (v === null) return null;
          return (
            <span
              key={r.key}
              title={`${r.name} · ${v.toFixed(1)}`}
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: pos(v), background: scoreColorOf(r.avg_score), border: "2px solid var(--surface)" }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px]" style={{ color: "var(--subtle)" }}>
        {Array.from({ length: 11 }, (_, i) => <span key={i}>{i}</span>)}
      </div>
    </Card>
  );
}

function StaffRow({ row, index, trend, date }: { row: StaffStatRow; index: number; trend: number[]; date: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [allStages, setAllStages] = useState(false);
  const score = normalizeScore(row.avg_score);
  const color = scoreColorOf(row.avg_score);
  const ext = row.name.replace(/\D/g, "");
  const stages = allStages ? row.stages : row.stages.slice(0, 5);

  return (
    <div style={{ background: open ? "var(--row-open)" : undefined }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full items-center px-[22px] text-left"
        style={{ gridTemplateColumns: "36px 2.2fr 140px 1.6fr 32px", columnGap: 20, height: 64, borderBottom: "1px solid var(--divider)" }}
      >
        <span className="font-mono text-sm font-semibold" style={{ color: "var(--subtle)" }}>{index + 1}</span>

        <span className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold"
            style={{ background: "var(--blue-tint)", color: "var(--accent-text)" }}
          >
            {ext || "—"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium" style={{ color: "var(--text)" }}>{row.name}</span>
            <span className="block truncate text-[13px]" style={{ color: "var(--muted)" }}>
              {t("st.calls", { n: formatNumber(row.calls) })} · {formatMinutes(row.minutes)} · {t("st.scored", { n: row.scored_calls })}
            </span>
          </span>
        </span>

        <span className="hidden xl:block"><Sparkline values={trend} /></span>

        <span className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 flex-1"><ProgressBar value={score ?? 0} max={10} color={color} height={8} /></span>
          <span className="shrink-0 font-mono text-xl font-semibold" style={{ color }}>{formatScore(row.avg_score)}</span>
          <span className="shrink-0 text-xs" style={{ color: "var(--subtle)" }}>/ 10</span>
        </span>

        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} style={{ color: "var(--subtle)" }} />
      </button>

      {open && (
        <div className="pb-5 pl-[78px] pr-[22px] pt-1">
          <div className="grid gap-4 xl:grid-cols-3">
            {/* Aybi */}
            <div className="rounded-xl p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--orange)" }}>{t("st.faults")}</p>
              <ul className="space-y-2">
                {row.faults.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tuzatish yo'li */}
            <div className="rounded-xl p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--green)" }}>{t("st.advice")}</p>
              <ol className="space-y-2">
                {row.advice.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--text-2)" }}>
                    <span className="shrink-0 font-mono text-xs font-semibold" style={{ color: "var(--green)" }}>{i + 1}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Skript bandlari */}
            <div className="rounded-xl p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>{t("st.stages")}</p>
              <ul className="space-y-2">
                {stages.map((s) => {
                  const tone = TONE[percentTone(s.pct)];
                  return (
                    <li key={s.title} className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 90px 36px" }}>
                      <span className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{s.title}</span>
                      <ProgressBar value={s.pct} color={tone.color} height={6} />
                      <span className="text-right font-mono text-xs" style={{ color: tone.color }}>{s.pct}%</span>
                    </li>
                  );
                })}
              </ul>
              {row.stages.length > 5 && (
                <button type="button" onClick={() => setAllStages((v) => !v)} className="mt-3 text-[13px] font-medium" style={{ color: "var(--accent-text)" }}>
                  {t("st.stagesAll", { n: row.stages.length })}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href={`/dashboard/recordings?operator=${encodeURIComponent(ext)}&date=${date}`}>
              <PrimaryButton>{t("st.viewCalls")}</PrimaryButton>
            </Link>
            <Link href={`/dashboard/recordings?date=${date}&lowest=${encodeURIComponent(ext)}`}>
              <SecondaryButton>{t("st.lowest")}</SecondaryButton>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffStatsView() {
  const t = useT();
  const session = useSession();
  const [date, setDate] = useState(() => tashkentDay());
  const [rows, setRows] = useState<StaffStatRow[] | null>(null);
  const [norms, setNorms] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [reloadKey, setReloadKey] = useState(0);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 60000);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      const [r, n] = await Promise.all([
        fetchStaffStats(date, ctrl.signal).then((x) => x.rows).catch(() => null),
        fetchCompanySettings(session?.token, ctrl.signal).catch(() => DEFAULT_COMPANY_SETTINGS),
      ]);
      if (ctrl.signal.aborted) return;
      setRows(r);
      setNorms(n);
    })();
    return () => ctrl.abort();
  }, [date, reloadKey, session?.token]);

  /* 7 kunlik trend — kunlik yakundan (o'rtacha ball). */
  const [trend, setTrend] = useState<number[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchDailySummary(7, ctrl.signal)
      .then((d) => setTrend(d.slice(0, 7).reverse().map((x) => normalizeScore(x.avg_score) ?? 0)))
      .catch(() => { /* trend — qo'shimcha, xatosi sahifani buzmaydi */ });
    return () => ctrl.abort();
  }, [reloadKey]);

  const sorted = useMemo(() => (rows ?? []).slice().sort((a, b) => b.avg_score - a.avg_score), [rows]);
  const totalCalls = sorted.reduce((s, r) => s + r.calls, 0);
  const goal = normalizeScore(norms.min_efficiency_score) ?? 8;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.staff-stats.label")}
        hint={t("st.hint", { n: sorted.length, m: formatNumber(totalCalls) })}
        right={
          <DateChips
            value={date}
            days={[0, -1, -2, -3].map((o) => tashkentDay(o))}
            labels={(d, i) => (i === 0 ? t("rec.today") : i === 1 ? t("rec.yesterday") : d.slice(5))}
            onChange={setDate}
          />
        }
      />

      {rows === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>
      ) : sorted.length === 0 ? (
        <Card><EmptyState text={t("st.empty")} /></Card>
      ) : (
        <>
          <Distribution rows={sorted} goal={goal} />

          <Card padded={false}>
            <div
              className="grid items-center px-[22px] text-[11px] font-medium uppercase tracking-[0.1em]"
              style={{ gridTemplateColumns: "36px 2.2fr 140px 1.6fr 32px", columnGap: 20, height: 38, color: "var(--subtle)", borderBottom: "1px solid var(--divider-strong)" }}
            >
              <span>#</span>
              <span>{t("st.col.operator")}</span>
              <span className="hidden xl:block">{t("st.col.trend")}</span>
              <span>{t("st.col.score")}</span>
              <span />
            </div>
            {sorted.map((r, i) => <StaffRow key={r.key} row={r} index={i} trend={trend} date={date} />)}
          </Card>
        </>
      )}
    </div>
  );
}

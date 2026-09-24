"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { Card, SectionTitle, Skeleton, score10, scoreColor } from "./ui";
import { fetchAnalysisStatus, type AnalysisStatus } from "../lib/api";
import { listCalls, type CallRow } from "../lib/calls";
import { AnalyticsErrorUI, categorizeError, type AnalyticsError } from "./AnalyticsErrorUI";

/* =====================================================================
 * TAHLIL HOLATI
 *
 * Nechta qo'ng'iroq tahlil qilindi, nechtasi qilinmadi va NEGA.
 * Har bir guruhning audiolari shu yerda — eshitib ko'rish mumkin.
 *
 * "Tahlil qilingan" = ball qo'yilgan (haqiqiy sotuv suhbati baholangan).
 * Qilinmaganlar sabablari: Javobsiz, Kunlik limitdan oshdi, Aloqa sifati
 * yomon, Noto'g'ri raqam, Sotuv suhbati emas va h.k.
 * ===================================================================== */

function tashkentDay(offset = 0): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 86400000));
}

const fmtMin = (m: number) => (m < 60 ? `${m.toFixed(1)} daq` : `${Math.floor(m / 60)} soat ${Math.round(m % 60)} daq`);
const fmtSec = (s: number | null | undefined) => {
  const n = Math.max(0, Number(s) || 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Tanlangan guruhning qo'ng'iroqlari — audio bilan. */
function CallList({ date, analyzed, reason }: { date: string; analyzed: boolean; reason?: string }) {
  const [rows, setRows] = useState<CallRow[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    listCalls({ date, analyzed, reason, limit: 200 }, ctrl.signal)
      .then((r) => setRows(r))
      .catch(() => setRows([]));
    return () => ctrl.abort();
  }, [date, analyzed, reason]);

  if (!rows) return <Skeleton className="h-40" />;
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Bu guruhda qo&apos;ng&apos;iroq yo&apos;q.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/30"
        >
          <span className="w-12 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{fmtTime(c.created_at)}</span>
          <span className="w-14 shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{fmtSec(c.duration)}</span>
          <span className="w-16 shrink-0">
            {c.kpi_score > 0 ? (
              <span className={`text-sm font-bold ${scoreColor(c.kpi_score)}`}>{score10(c.kpi_score)}/10</span>
            ) : (
              <span className="text-xs text-slate-400">ballsiz</span>
            )}
          </span>
          {c.audio_url ? (
            <audio controls preload="none" src={c.audio_url} className="h-9 min-w-0 flex-1" />
          ) : (
            <span className="flex-1 text-xs text-slate-400">audio yo&apos;q</span>
          )}
        </div>
      ))}
      {rows.length === 200 && (
        <p className="text-center text-xs text-slate-400">Birinchi 200 tasi ko&apos;rsatildi.</p>
      )}
    </div>
  );
}

export function AnalysisStatusView() {
  const [date, setDate] = useState(() => tashkentDay());
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState<AnalyticsError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /* tanlangan guruh: "analyzed" | "not" | sabab nomi */
  const [tab, setTab] = useState<string>("analyzed");

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 60000);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalysisStatus(date, ctrl.signal)
      .then((r) => { setStatus(r.status); setError(null); })
      .catch((e) => setError(categorizeError(e)));
    return () => ctrl.abort();
  }, [date, reloadKey]);

  return (
    <div className="animate-slide-up space-y-6">
      <SectionTitle
        title="Tahlil holati"
        subtitle="Nechta qo'ng'iroq tahlil qilindi, nechtasi qilinmadi va nega — audiolari bilan"
      />

      <div className="flex flex-wrap gap-2">
        {[0, -1, -2, -3].map((off) => {
          const d = tashkentDay(off);
          const label = off === 0 ? "Bugun" : off === -1 ? "Kecha" : d.slice(5);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                date === d
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && <AnalyticsErrorUI error={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!status && !error && <Skeleton className="h-32" />}

      {status && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jami qo&apos;ng&apos;iroq</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{status.total}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Tahlil qilingan</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{status.analyzed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{fmtMin(status.analyzed_minutes)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Tahlil qilinmagan</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{status.not_analyzed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{fmtMin(status.not_analyzed_minutes)}</p>
            </Card>
          </div>

          {/* Operatorlar kesimi — kim limitga yetgani */}
          {status.operators.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Operatorlar kesimi</p>
              <div className="space-y-2">
                {status.operators.map((o) => (
                  <div key={o.operator} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="w-36 shrink-0 font-medium text-slate-700 dark:text-slate-200">{o.operator}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{o.analyzed} tahlil</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-amber-600 dark:text-amber-400">{o.skipped} qilinmagan</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400">{fmtMin(o.analyzed_minutes)} tahlil qilingan</span>
                    {o.limit_reached && (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        kunlik limitga yetdi
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Guruhlar */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("analyzed")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === "analyzed" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              Tahlil qilinganlar ({status.analyzed})
            </button>
            <button
              type="button"
              onClick={() => setTab("not")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === "not" ? "bg-amber-600 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              Qilinmaganlar ({status.not_analyzed})
            </button>
            {status.reasons.map((r) => (
              <button
                key={r.reason}
                type="button"
                onClick={() => setTab(r.reason)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  tab === r.reason
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {r.reason}: {r.count}
              </button>
            ))}
          </div>

          <Card className="p-5">
            <CallList
              date={date}
              analyzed={tab === "analyzed"}
              reason={tab === "analyzed" || tab === "not" ? undefined : tab}
            />
          </Card>
        </>
      )}
    </div>
  );
}

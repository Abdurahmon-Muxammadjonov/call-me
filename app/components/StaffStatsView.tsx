"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { Card, SectionTitle, Skeleton, scoreColor } from "./ui";
import { formatScore } from "../lib/format";
import { fetchStaffStats, type StaffStatRow } from "../lib/api";
import { AnalyticsErrorUI, categorizeError, type AnalyticsError } from "./AnalyticsErrorUI";

/* =====================================================================
 * XODIMLAR STATISTIKASI
 *
 * Maqsad: sotuvchining aybini topib, sotuvga yordam berish. Har xodim
 * uchun karta: kunlik ball (10 ballik), qo'ng'iroqlar soni va gaplashgan
 * vaqti. Kartani bosganda pastda ochiladi:
 *   - QIZIL bo'lim: aybi (nima noto'g'ri ketyapti, raqam bilan)
 *   - YASHIL bo'lim: buni qanday tuzatish (amaliy, aytiladigan gap bilan)
 *
 * Raqamlar kun davomida yangilanib boradi; ish vaqti tugagach (23:00)
 * o'zgarmaydi — ya'ni kun yakunidagi holat shu yerda qoladi.
 * ===================================================================== */

/** Toshkent kunini YYYY-MM-DD ko'rinishida beradi. */
function tashkentDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtMin(min: number): string {
  if (min < 60) return `${min.toFixed(1)} daq`;
  return `${Math.floor(min / 60)} soat ${Math.round(min % 60)} daq`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.replace(/\D/g, "").slice(-2) || name.slice(0, 2).toUpperCase();
}

function StaffCard({ row }: { row: StaffStatRow }) {
  const [open, setOpen] = useState(false);
  const hasScore = row.avg_score > 0;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
          {initials(row.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.name}</span>
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
            {row.calls} qo&apos;ng&apos;iroq · {fmtMin(row.minutes)} · {row.scored_calls} tasi baholangan
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className={`block text-2xl font-bold tabular-nums ${hasScore ? scoreColor(row.avg_score) : "text-slate-400"}`}>
            {formatScore(row.avg_score)}
          </span>
          <span className="block text-xs text-slate-400">/ 10</span>
        </span>

        <span className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-200 p-5 dark:border-slate-700">
          {/* AYBI — qizil */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Aybi — nima noto&apos;g&apos;ri ketyapti
            </p>
            <ul className="space-y-1.5">
              {row.faults.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-rose-700 dark:text-rose-300">
                  <span className="shrink-0">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TAVSIYA — yashil */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Qanday tuzatish kerak
            </p>
            <ul className="space-y-1.5">
              {row.advice.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-emerald-700 dark:text-emerald-300">
                  <span className="shrink-0">✓</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Skript bandlari bo'yicha bajarish */}
          {row.stages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Skript bandlari (o&apos;rtacha bajarish)
              </p>
              <ul className="space-y-1.5">
                {row.stages.map((s) => (
                  <li key={s.title} className="flex items-center gap-3 text-sm">
                    <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {s.pct}%
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <span
                        className={`block h-full rounded-full ${s.pct >= 80 ? "bg-emerald-500" : s.pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.max(2, s.pct)}%` }}
                      />
                    </span>
                    <span className="w-52 shrink-0 truncate text-slate-500 dark:text-slate-400">{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Baholanmagan qo'ng'iroqlar sabablari */}
          {row.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {row.reasons.map((r) => (
                <span
                  key={r.reason}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {r.reason}: {r.count} ta
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function StaffStatsView() {
  const [date, setDate] = useState<string>(() => tashkentDay());
  const [rows, setRows] = useState<StaffStatRow[] | null>(null);
  const [error, setError] = useState<AnalyticsError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Kun davomida yangilanib tursin (kun tugagach raqamlar o'zgarmaydi).
  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 60000);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchStaffStats(date, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setRows(r.rows);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(categorizeError(e));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [date, reloadKey]);

  const total = rows?.reduce((s, r) => s + r.calls, 0) ?? 0;

  return (
    <div className="animate-slide-up space-y-6">
      <SectionTitle
        title="Xodimlar statistikasi"
        subtitle="Har bir operatorning kunlik bali, aybi va uni tuzatish yo'li — kartani bosing"
      />

      <div className="flex flex-wrap items-center gap-2">
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
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
        {rows && (
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            {rows.length} operator · {total} qo&apos;ng&apos;iroq
          </span>
        )}
      </div>

      {loading && !rows && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {error && <AnalyticsErrorUI error={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {rows && rows.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Bu kunda operator qo&apos;ng&apos;iroqlari topilmadi.
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <StaffCard key={r.key} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

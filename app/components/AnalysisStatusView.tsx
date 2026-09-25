"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Info, Pause, Play } from "lucide-react";
import { fetchAnalysisStatus, type AnalysisStatus } from "../lib/api";
import { listCalls, type CallRow } from "../lib/calls";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import {
  formatDuration, formatMinutes, formatNumber, formatPercent, formatTime, tashkentDay,
} from "../lib/format";
import { Card, CardHeader, DateChips, EmptyState, PageHeader, Skeleton } from "./kit";

/* =====================================================================
 * TAHLIL HOLATI (spetsifikatsiya 3.5)
 *
 * Kunlik umumiy karta (bitta chiziqda butun kun), operatorlar kesimi va
 * qo'ng'iroqlar ro'yxati (sabab chiplari bilan filtrlanadi).
 *
 * "raqam bog'lanmagan" chipi FAQAT operator raqami saqlana boshlagandan
 * KEYINGI kunlar uchun chiqadi — undan oldingi kunlar uchun info-ikonka
 * va izoh. Chegara sanasi qattiq yozilmagan: birinchi operator_ext bor
 * qo'ng'iroq sanasidan olinadi (LEGACY_FROM).
 * ===================================================================== */

/** Operator raqami saqlana boshlagan sana — bazadagi birinchi qiymatdan. */
const LEGACY_FROM = "2026-09-24";

const REASON_COLOR: Record<string, string> = {
  "Javobsiz": "var(--orange)",
  "Qisqa suhbat": "var(--amber)",
  "Keyinroq qayta qo'ng'iroq": "var(--violet)",
  "Noto'g'ri raqam": "var(--pink)",
  "Aloqa sifati yomon": "var(--slate)",
  "Mijoz go'shakni qo'ydi": "var(--slate-2)",
  "Sotuv suhbati emas": "var(--teal)",
  "Kunlik limitdan oshdi": "var(--amber)",
};

/** Sahifada bitta audio o'ynaydi. */
let current: HTMLAudioElement | null = null;

function RowPlayer({ src }: { src: string }) {
  const t = useT();
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(0);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (current && current !== el) current.pause();
      current = el;
      void el.play();
    } else el.pause();
  };

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration || 0)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("rec.pause") : t("rec.listen")}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:opacity-85"
        style={playing
          ? { background: "var(--accent)", color: "var(--accent-fg)" }
          : { background: "var(--nav-active)", color: "var(--text-2)" }}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label={t("rec.listen")}
        onClick={(e) => {
          const el = ref.current;
          if (!el || !total) return;
          const r = e.currentTarget.getBoundingClientRect();
          el.currentTime = ((e.clientX - r.left) / r.width) * total;
        }}
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full"
        style={{ background: "var(--track-audio)" }}
      >
        <span className="block h-full rounded-full" style={{ width: `${total ? (time / total) * 100 : 0}%`, background: "var(--chart)" }} />
      </button>
      <span className="shrink-0 font-mono text-xs" style={{ color: "var(--muted)" }}>
        {formatDuration(time)} / {formatDuration(total)}
      </span>
    </span>
  );
}

export function AnalysisStatusView() {
  const t = useT();
  const [date, setDate] = useState(() => tashkentDay());
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [filter, setFilter] = useState<string>("analyzed");
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [limit, setLimit] = useState(20);

  /* Filtr yoki sana almashsa ro'yxat boshidan ko'rsatiladi — bu effektda
     emas, hodisa ichida qilinadi (react-hooks qoidasi). */
  const pickFilter = useCallback((key: string) => { setLimit(20); setFilter(key); }, []);
  const pickDate = useCallback((d: string) => { setLimit(20); setDate(d); }, []);
  const [reloadKey, setReloadKey] = useState(0);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 60000);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchAnalysisStatus(date, ctrl.signal)
      .then((r) => setStatus(r.status))
      .catch(() => setStatus(null));
    return () => ctrl.abort();
  }, [date, reloadKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      const rows = await listCalls({
        date, limit: 200,
        analyzed: filter === "analyzed" ? true : filter === "not" ? false : undefined,
        reason: filter === "analyzed" || filter === "not" ? undefined : filter,
      }, ctrl.signal).catch(() => null);
      if (!ctrl.signal.aborted) setCalls(rows);
    })();
    return () => ctrl.abort();
  }, [date, filter, reloadKey]);

  const legacy = date < LEGACY_FROM;
  const totalCalls = status?.total ?? 0;
  const segments = useMemo(() => {
    if (!status) return [];
    return [
      { key: "analyzed", label: t("as.chip.analyzed"), count: status.analyzed, color: "var(--green)" },
      ...status.reasons.map((r) => ({
        key: r.reason, label: r.reason, count: r.count, color: REASON_COLOR[r.reason] ?? "var(--slate-2)",
      })),
    ];
  }, [status, t]);

  const maxOpCalls = Math.max(1, ...(status?.operators ?? []).map((o) => o.analyzed + o.skipped));
  const shown = (calls ?? []).slice(0, limit);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.analysis-status.label")}
        hint={t("as.hint")}
        right={
          <DateChips
            value={date}
            days={[0, -1, -2, -3].map((o) => tashkentDay(o))}
            labels={(d, i) => (i === 0 ? t("rec.today") : i === 1 ? t("rec.yesterday") : d.slice(5))}
            onChange={pickDate}
          />
        }
      />

      {!status ? (
        <Skeleton height={160} />
      ) : (
        <>
          {/* A) Umumiy karta */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[13px]" style={{ color: "var(--muted)" }}>{date}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-[40px] font-semibold leading-none" style={{ color: "var(--text)" }}>
                    {formatNumber(status.total)}
                  </span>
                  <span className="text-[15px]" style={{ color: "var(--muted)" }}>
                    {t("as.calls")} · {formatMinutes(status.analyzed_minutes + status.not_analyzed_minutes)}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-7">
                {[
                  { v: status.analyzed, label: t("as.analyzed"), color: "var(--green)" },
                  { v: status.not_analyzed, label: t("as.notAnalyzed"), color: "var(--amber)" },
                ].map((x) => (
                  <span key={x.label} className="text-right">
                    <span className="block font-mono text-[22px] font-semibold" style={{ color: x.color }}>{formatNumber(x.v)}</span>
                    <span className="block text-xs" style={{ color: "var(--muted)" }}>
                      {x.label} · {totalCalls > 0 ? formatPercent((x.v / totalCalls) * 100, 0) : "0%"}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Butun kun bitta chiziqda */}
            <div className="mt-4 flex gap-[3px]" style={{ height: 30 }} aria-hidden>
              {segments.filter((s) => s.count > 0).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => pickFilter(s.key)}
                  className="rounded-md transition hover:opacity-80"
                  style={{ width: `${Math.max(1, (s.count / Math.max(1, totalCalls)) * 100)}%`, minWidth: 3, background: s.color }}
                  title={`${s.label}: ${s.count}`}
                />
              ))}
            </div>

            {/* Legenda */}
            <div className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {segments.filter((s) => s.count > 0).map((s) => (
                <button key={s.key} type="button" onClick={() => pickFilter(s.key)} className="flex items-center gap-2 text-left">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--text-2)" }}>{s.label}</span>
                  <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--text)" }}>{formatNumber(s.count)}</span>
                  <span className="font-mono text-xs" style={{ color: "var(--subtle)" }}>
                    {totalCalls > 0 ? formatPercent((s.count / totalCalls) * 100, 0) : "0%"}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* B) Operatorlar kesimi */}
          <Card padded={false}>
            <div className="px-[22px] py-5">
              <CardHeader
                title={t("as.ops.title")}
                hint={t("as.ops.hint")}
                right={
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-3)" }}>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--green)" }} />{t("as.analyzed")}</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--not-analyzed-bar)" }} />{t("as.notAnalyzed")}</span>
                  </div>
                }
              />
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div
                  className="grid items-center px-[22px] text-[11px] font-medium uppercase tracking-[0.1em]"
                  style={{ gridTemplateColumns: "210px 1fr 150px 170px", columnGap: 20, height: 38, color: "var(--subtle)", borderTop: "1px solid var(--divider-strong)", borderBottom: "1px solid var(--divider-strong)" }}
                >
                  <span>{t("as.col.operator")}</span>
                  <span>{t("as.col.ratio")}</span>
                  <span>{t("as.col.split")}</span>
                  <span>{t("as.col.time")}</span>
                </div>

                {status.operators.map((o) => {
                  const total = o.analyzed + o.skipped;
                  const unknown = o.operator === "Aniqlanmagan";
                  return (
                    <div
                      key={o.operator}
                      className="grid items-center px-[22px]"
                      style={{
                        gridTemplateColumns: "210px 1fr 150px 170px", columnGap: 20, height: 42,
                        borderBottom: "1px solid var(--divider)",
                        background: unknown ? "rgba(251,146,60,0.05)" : undefined,
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{o.operator}</span>
                        {unknown && (legacy ? (
                          <span title={t("as.legacyHint", { date: LEGACY_FROM })}>
                            <Info className="h-3.5 w-3.5" style={{ color: "var(--subtle)" }} />
                          </span>
                        ) : (
                          <Link
                            href="/dashboard/operators"
                            className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium"
                            style={{ background: "rgba(251,146,60,0.16)", color: "var(--orange-soft)" }}
                          >
                            {t("as.unlinked")}
                          </Link>
                        ))}
                      </span>

                      <span className="flex h-2.5 min-w-0 overflow-hidden rounded-full" aria-hidden>
                        <span style={{ width: `${(o.analyzed / maxOpCalls) * 100}%`, background: "var(--green)" }} />
                        <span style={{ width: `${(o.skipped / maxOpCalls) * 100}%`, background: "var(--not-analyzed-bar)" }} />
                      </span>

                      <span className="font-mono text-[13px] font-medium">
                        <span style={{ color: "var(--green)" }}>{formatNumber(o.analyzed)}</span>
                        <span style={{ color: "var(--faint)" }}> · </span>
                        <span style={{ color: "var(--amber)" }}>{formatNumber(o.skipped)}</span>
                        <span style={{ color: "var(--faint)" }}> / {formatNumber(total)}</span>
                      </span>

                      <span className="font-mono text-[13px]" style={{ color: "var(--text-3)" }}>{formatMinutes(o.analyzed_minutes)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* C) Qo'ng'iroqlar */}
          <Card padded={false}>
            <div className="flex flex-wrap gap-2 px-[22px] py-4">
              {[
                { key: "analyzed", label: `${t("as.chip.analyzed")} · ${status.analyzed}`, color: "var(--green)", border: "rgba(74,222,154,0.35)", bg: "rgba(74,222,154,0.08)" },
                { key: "not", label: `${t("as.chip.not")} · ${status.not_analyzed}`, color: "var(--amber)", border: "rgba(250,204,21,0.35)", bg: "rgba(250,204,21,0.08)" },
                ...status.reasons.map((r) => ({
                  key: r.reason, label: `${r.reason} · ${r.count}`,
                  color: "var(--text-2)", border: "var(--border-chip)", bg: "var(--surface-3)",
                })),
              ].map((c) => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => pickFilter(c.key)}
                    className="inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium transition"
                    style={active
                      ? { background: "var(--text)", border: "1px solid var(--text)", color: "var(--bg)" }
                      : { background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {calls === null ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>
            ) : shown.length === 0 ? (
              <EmptyState text={t("as.empty")} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-[780px]">
                    {shown.map((c) => (
                      <div
                        key={c.id}
                        className="grid items-center px-[22px]"
                        style={{ gridTemplateColumns: "64px 64px 140px 150px 1fr 96px", columnGap: 16, height: 64, borderBottom: "1px solid var(--divider)" }}
                      >
                        <span className="font-mono text-sm font-medium" style={{ color: "var(--text)" }}>{formatTime(c.created_at)}</span>
                        <span className="font-mono text-[13px]" style={{ color: "var(--text-3)" }}>{formatDuration(c.duration)}</span>
                        <span className="truncate text-sm" style={{ color: "var(--text-2)" }}>
                          {c.operator_ext ? `Operator ${c.operator_ext}` : t("rec.unknownOperator")}
                        </span>
                        <span className="min-w-0">
                          {c.kpi_score > 0 ? (
                            <span className="font-mono text-sm font-semibold" style={{ color: "var(--green)" }}>{(c.kpi_score / 10).toFixed(1)}/10</span>
                          ) : (
                            <span
                              className="inline-flex h-[26px] max-w-full items-center truncate rounded-full px-2.5 text-xs"
                              style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "#FDE68A" }}
                            >
                              {c.dropped_reason || t("rec.unscored")}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">{c.audio_url && <RowPlayer src={c.audio_url} />}</span>
                        <span className="text-right">
                          <Link
                            href={`/dashboard/recordings?call=${c.id}`}
                            className="inline-flex h-10 items-center rounded-[10px] px-3.5 text-[13px] font-medium"
                            style={{ background: "var(--view-btn-bg)", color: "var(--view-btn-text)" }}
                          >
                            {t("rec.view")}
                          </Link>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {(calls?.length ?? 0) > limit && (
                  <div className="flex justify-center p-4">
                    <button
                      type="button"
                      onClick={() => setLimit((l) => l + 20)}
                      className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium"
                      style={{ background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text)" }}
                    >
                      {t("as.more")}
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

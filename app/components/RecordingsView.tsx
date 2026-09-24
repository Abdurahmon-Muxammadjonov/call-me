"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listCalls, listManagers, type CallRow } from "../lib/calls";
import { fetchDailySummary, type DailySummaryDay } from "../lib/api";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import { formatScore, normalizeScore } from "../lib/format";
import { CallsTable } from "./calls/CallsTable";
import { CallDetailPanel } from "./calls/CallDetailPanel";

/* =====================================================================
 * "Audio yozuvlar" sahifasi (2026-09-25 qayta dizayn).
 *
 * Tuzilishi: sarlavha → 4 ta KPI kartochka → jadval kartasi (segmentli
 * filtr + qidiruv) → o'ngdan ochiladigan tafsilot paneli.
 *
 * Ranglar globals.css'dagi --rec-* tokenlaridan; mavzu almashganda
 * o'zgaruvchilar qiymati almashadi, komponentlarda shart yo'q.
 * ===================================================================== */

const tashkentDay = (offset = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offset * 86400000));

const fmtNum = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: { text: string; tone: "up" | "down" | "flat" };
  tone?: "orange";
}) {
  const hintColor =
    hint?.tone === "up" ? "var(--rec-green)" : hint?.tone === "down" ? "var(--rec-orange)" : "var(--rec-text-3)";
  return (
    <div className="rounded-[14px] p-5" style={{ background: "var(--rec-kpi)", border: "1px solid var(--rec-border)" }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--rec-text-3)" }}>{label}</p>
      <p
        className="mt-2 font-mono text-3xl font-semibold tabular-nums"
        style={{ color: tone === "orange" ? "var(--rec-orange)" : "var(--rec-text)" }}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs" style={{ color: hintColor }}>{hint.text}</p>}
    </div>
  );
}

type Segment = "all" | "scored" | "unscored" | "low";

export function RecordingsView() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();

  const [date, setDate] = useState(() => tashkentDay());
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [managers, setManagers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<DailySummaryDay[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<Segment>("all");
  const [query, setQuery] = useState("");
  const [mgrFilter, setMgrFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /* Panel URL bilan sinxron: ?call={id} — havolani ulashsa yoki sahifani
   * yangilasa panel o'sha qo'ng'iroq bilan ochiladi, "Orqaga" yopadi. */
  const openId = params.get("call");
  const setOpenId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (id) next.set("call", id);
      else next.delete("call");
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 20000);

  /* Yuklash bayrog'i effekt ichida YOQILMAYDI (react-hooks qoidasi): u
   * boshlang'ich true, sana almashtirilganda esa tugma bosilishida
   * (hodisa ichida) yoqiladi. */
  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const [rows, mgrs, sum] = await Promise.all([
          listCalls({ limit: 200, date }, ctrl.signal),
          listManagers(ctrl.signal).catch(() => []),
          fetchDailySummary(3, ctrl.signal).catch(() => null),
        ]);
        if (ctrl.signal.aborted) return;
        setCalls(rows);
        setManagers(Object.fromEntries((mgrs as { id: string; name: string }[]).map((m) => [m.id, m.name])));
        setSummary(sum);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [date, reloadKey]);

  const pickDate = useCallback((d: string) => {
    setLoading(true);
    setDate(d);
  }, []);

  const nameOf = useCallback(
    (c: CallRow) => managers[c.manager_id] || (c.operator_ext ? `Operator ${c.operator_ext}` : "Aniqlanmagan"),
    [managers],
  );

  const counts = useMemo(() => {
    const scored = calls.filter((c) => c.kpi_score > 0);
    return {
      all: calls.length,
      scored: scored.length,
      unscored: calls.length - scored.length,
      low: scored.filter((c) => c.kpi_score < 50).length,
    };
  }, [calls]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls.filter((c) => {
      if (segment === "scored" && !(c.kpi_score > 0)) return false;
      if (segment === "unscored" && c.kpi_score > 0) return false;
      if (segment === "low" && !(c.kpi_score > 0 && c.kpi_score < 50)) return false;
      if (mgrFilter && c.manager_id !== mgrFilter && c.operator_ext !== mgrFilter) return false;
      if (!q) return true;
      return `${nameOf(c)} ${c.rop_comment ?? ""} ${c.dropped_reason ?? ""}`.toLowerCase().includes(q);
    });
  }, [calls, segment, query, mgrFilter, nameOf]);

  const today = summary?.find((d) => d.date === date);
  const prev = summary?.find((d) => d.date === tashkentDay(-1));
  const pct = (cur: number, before: number) => (before > 0 ? Math.round(((cur - before) / before) * 100) : null);
  const callsPct = today && prev ? pct(today.calls, prev.calls) : null;
  const todayScore = normalizeScore(today?.avg_score);
  const prevScore = normalizeScore(prev?.avg_score);
  const scoreDiff = todayScore !== null && prevScore !== null ? Math.round((todayScore - prevScore) * 10) / 10 : null;

  /* Operatorlar ro'yxati — filtr uchun (ichki raqamlar ham kiradi). */
  const operatorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    calls.forEach((c) => {
      const key = c.manager_id || c.operator_ext || "";
      if (key && !seen.has(key)) seen.set(key, nameOf(c));
    });
    return [...seen.entries()];
  }, [calls, nameOf]);

  const idx = visible.findIndex((c) => c.id === openId);
  const openAt = (i: number) => { if (visible[i]) setOpenId(visible[i].id); };

  const weekday = new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", weekday: "long" }).format(new Date(`${date}T12:00:00Z`));
  const nice = new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`));

  return (
    <div className="animate-slide-up" style={{ color: "var(--rec-text)" }}>
      <div className={openId ? "xl:flex xl:gap-6" : ""}>
        <div className="min-w-0 flex-1 space-y-6">
          {/* 2.1 Sarlavha */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-[28px] font-semibold leading-tight">
                Audio yozuvlar
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--rec-green)" }}>
                  <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--rec-green)" }} />
                  {t("rec.live")}
                </span>
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--rec-text-2)" }}>
                {weekday}, {nice} · {t("rec.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[0, -1, -2].map((off) => {
                const d = tashkentDay(off);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDate(d)}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium transition"
                    style={
                      date === d
                        ? { background: "var(--rec-accent)", color: "#fff" }
                        : { background: "var(--rec-btn-bg)", border: "1px solid var(--rec-btn-border)", color: "var(--rec-text-2)" }
                    }
                  >
                    {off === 0 ? t("rec.today") : off === -1 ? t("rec.yesterday") : d.slice(5)}
                  </button>
                );
              })}
            </div>
          </header>

          {/* 2.2 KPI kartochkalar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t("rec.kpi.calls")}
              value={fmtNum(today?.calls ?? counts.all)}
              hint={callsPct === null ? undefined : {
                text: t("rec.kpi.vsYesterday", { delta: `${callsPct > 0 ? "+" : ""}${callsPct}%` }),
                tone: callsPct > 0 ? "up" : callsPct < 0 ? "down" : "flat",
              }}
            />
            <KpiCard
              label={t("rec.kpi.scored")}
              value={fmtNum(today?.scored ?? counts.scored)}
              hint={{
                text: t("rec.kpi.ofTotal", { pct: today && today.calls ? Math.round((today.scored / today.calls) * 100) : 0 }),
                tone: "flat",
              }}
            />
            <KpiCard
              label={t("rec.kpi.avg")}
              value={formatScore(today?.avg_score)}
              hint={scoreDiff === null ? undefined : {
                text: t("rec.kpi.vsYesterday", { delta: `${scoreDiff > 0 ? "+" : ""}${scoreDiff.toFixed(1)}` }),
                tone: scoreDiff > 0 ? "up" : scoreDiff < 0 ? "down" : "flat",
              }}
            />
            <KpiCard
              label={t("rec.kpi.attention")}
              value={fmtNum(today?.low_score ?? counts.low)}
              hint={{ text: t("rec.kpi.lowHint"), tone: "flat" }}
              tone="orange"
            />
          </div>

          {/* 2.3 Jadval kartasi */}
          <div className="rounded-2xl" style={{ background: "var(--rec-card)", border: "1px solid var(--rec-border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["all", `${t("rec.seg.all")} ${counts.all}`],
                  ["scored", `${t("rec.seg.scored")} ${counts.scored}`],
                  ["unscored", `${t("rec.seg.unscored")} ${counts.unscored}`],
                  ["low", `${t("rec.seg.low")} ${counts.low}`],
                ] as [Segment, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSegment(key)}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium transition"
                    style={
                      segment === key
                        ? { background: "var(--rec-segment-active)", color: "var(--rec-text)" }
                        : { color: key === "low" ? "var(--rec-orange)" : "var(--rec-text-2)" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={mgrFilter}
                  onChange={(e) => setMgrFilter(e.target.value)}
                  aria-label="Operator bo'yicha filtr"
                  className="min-h-11 rounded-xl px-3 text-sm"
                  style={{ background: "var(--rec-btn-bg)", border: "1px solid var(--rec-btn-border)", color: "var(--rec-text)" }}
                >
                  <option value="">{t("rec.allOperators")}</option>
                  {operatorOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("rec.searchPlaceholder")}
                  aria-label="Qidiruv"
                  className="min-h-11 w-56 rounded-xl px-3 text-sm"
                  style={{ background: "var(--rec-btn-bg)", border: "1px solid var(--rec-btn-border)", color: "var(--rec-text)" }}
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[60px] animate-pulse rounded-xl" style={{ background: "var(--rec-divider)" }} />
                ))}
              </div>
            ) : (
              <CallsTable calls={visible} managerName={nameOf} activeId={openId} onOpen={setOpenId} />
            )}
          </div>
        </div>

        {openId && (
          <div className="xl:w-[440px] xl:shrink-0">
            <CallDetailPanel
              key={openId}
              callId={openId}
              managerName={nameOf(visible[idx] ?? calls.find((c) => c.id === openId) ?? ({} as CallRow))}
              onClose={() => setOpenId(null)}
              onPrev={idx > 0 ? () => openAt(idx - 1) : undefined}
              onNext={idx >= 0 && idx < visible.length - 1 ? () => openAt(idx + 1) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

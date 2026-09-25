"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, Download, Search } from "lucide-react";
import { listCalls, listManagers, type CallRow } from "../lib/calls";
import { fetchDailySummary, type DailySummaryDay } from "../lib/api";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import { downloadCsv } from "../lib/exportCsv";
import {
  formatDayLong, formatNumber, formatScore, formatTime,
  normalizeScore, tashkentDay,
} from "../lib/format";
import { IconButton, PageHeader, SecondaryButton, SegmentedControl, Skeleton } from "./kit";
import { CallsTable } from "./calls/CallsTable";
import { CallDetailPanel } from "./calls/CallDetailPanel";

/* =====================================================================
 * AUDIO YOZUVLAR (spetsifikatsiya 3.6)
 *
 * Sarlavha (Jonli belgisi bilan) → 4 ta plitka → jadval kartasi
 * (segmentli filtr, operator tanlagich, qidiruv) → o'ngdan ochiladigan
 * qo'ng'iroq paneli.
 * ===================================================================== */

type Segment = "all" | "scored" | "unscored" | "low";

/** Kichik plitka — 3.6 A (KpiTile'dan soddaroq: ikonkasiz, izoh yonida). */
function Tile({ label, value, hint, hintTone, valueTone }: {
  label: string; value: string; hint?: string;
  hintTone?: "green" | "orange" | "muted"; valueTone?: "orange";
}) {
  const hintColor = hintTone === "green" ? "var(--green)" : hintTone === "orange" ? "var(--orange)" : "var(--muted)";
  return (
    <div className="rounded-[14px] px-[18px] py-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none" style={{ color: valueTone === "orange" ? "var(--orange)" : "var(--text)" }}>
          {value}
        </span>
        {hint && <span className="text-xs" style={{ color: hintColor }}>{hint}</span>}
      </p>
    </div>
  );
}

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
  const [operator, setOperator] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  /* Jadvaldagi ▶ bilan o'ynalayotgan audio — panel pleeri bilan bitta
     manba bo'lishi uchun sahifada bitta <audio> ushlab turamiz. */
  const rowAudio = useRef<HTMLAudioElement | null>(null);

  const openId = params.get("call");
  const setOpenId = useCallback((id: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (id) next.set("call", id); else next.delete("call");
    router.push(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 20000);

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

  const pickDate = useCallback((d: string) => { setLoading(true); setDate(d); }, []);

  const nameOf = useCallback(
    (c: CallRow) => managers[c.manager_id] || (c.operator_ext ? `Operator ${c.operator_ext}` : t("rec.unknownOperator")),
    [managers, t],
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

  const matches = useCallback((c: CallRow) => {
    const q = query.trim().toLowerCase();
    if (segment === "scored" && !(c.kpi_score > 0)) return false;
    if (segment === "unscored" && c.kpi_score > 0) return false;
    if (segment === "low" && !(c.kpi_score > 0 && c.kpi_score < 50)) return false;
    if (operator && c.manager_id !== operator && c.operator_ext !== operator) return false;
    if (!q) return true;
    return `${nameOf(c)} ${c.rop_comment ?? ""} ${c.dropped_reason ?? ""}`.toLowerCase().includes(q);
  }, [segment, query, operator, nameOf]);

  const visible = useMemo(() => calls.filter(matches), [calls, matches]);

  const today = summary?.find((d) => d.date === date);
  const prev = summary?.find((d) => d.date === tashkentDay(-1));
  const callsPct = today && prev && prev.calls > 0 ? Math.round(((today.calls - prev.calls) / prev.calls) * 100) : null;
  const todayScore = normalizeScore(today?.avg_score);
  const prevScore = normalizeScore(prev?.avg_score);
  const scoreDiff = todayScore !== null && prevScore !== null ? Math.round((todayScore - prevScore) * 10) / 10 : null;
  const scoredPct = today && today.calls > 0 ? Math.round((today.scored / today.calls) * 100) : 0;

  const operatorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    calls.forEach((c) => {
      const key = c.manager_id || c.operator_ext || "";
      if (key && !seen.has(key)) seen.set(key, nameOf(c));
    });
    return [...seen.entries()];
  }, [calls, nameOf]);

  /* Jadvaldagi ▶ — sahifada bitta audio o'ynaydi. */
  const playRow = useCallback((c: CallRow) => {
    if (!c.audio_url) return;
    if (rowAudio.current) { rowAudio.current.pause(); rowAudio.current = null; }
    const el = new Audio(c.audio_url);
    rowAudio.current = el;
    void el.play();
  }, []);

  useEffect(() => () => { rowAudio.current?.pause(); }, []);

  /* CSV — joriy filtrlar bilan HAMMA qatorlar (10 000 gacha). */
  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const all: CallRow[] = [];
      for (let offset = 0; offset < 10000; offset += 200) {
        const page = await listCalls({ limit: 200, date, offset });
        all.push(...page);
        if (page.length < 200) break;
      }
      const rows = all.filter(matches).map((c) => [
        c.created_at.slice(0, 10),
        formatTime(c.created_at),
        nameOf(c),
        c.direction === "incoming" ? t("rec.incoming") : c.direction === "outgoing" ? t("rec.outgoing") : "—",
        Math.round(Number(c.duration) || 0),
        c.kpi_score > 0 ? "" : (c.dropped_reason || t("rec.unscored")),
        c.kpi_score > 0 ? formatScore(c.kpi_score) : "",
        Math.round(Number(c.penalty_amount) || 0),
        Math.round(Number(c.bonus_amount) || 0),
      ]);
      downloadCsv(
        `audio-yozuvlar-${date}.csv`,
        ["sana", "vaqt", "operator", "yo'nalish", "davomiylik (soniya)", "holat/sabab", "ball", "jarima", "bonus"],
        rows,
      );
    } finally {
      setExporting(false);
    }
  }, [date, matches, nameOf, t]);

  const idx = visible.findIndex((c) => c.id === openId);
  const openAt = (i: number) => { if (visible[i]) setOpenId(visible[i].id); };

  return (
    <div className={openId ? "xl:flex xl:gap-5" : ""}>
      <div className="min-w-0 flex-1 space-y-5">
        <PageHeader
          title={t("nav.recordings.label")}
          live={t("rec.live")}
          hint={`${formatDayLong(date)} · ${t("rec.subtitle")}`}
          right={
            <>
              <SecondaryButton onClick={() => pickDate(date === tashkentDay() ? tashkentDay(-1) : tashkentDay())}>
                <CalendarDays className="h-4 w-4" />
                {date === tashkentDay() ? t("rec.today") : t("rec.yesterday")}
                <span aria-hidden style={{ color: "var(--subtle)" }}>▾</span>
              </SecondaryButton>
              <SecondaryButton onClick={exportCsv}>
                <Download className="h-4 w-4" />
                {exporting ? t("common.loading") : t("rec.export")}
              </SecondaryButton>
              <IconButton ariaLabel={t("rec.notifications")}><Bell className="h-[18px] w-[18px]" /></IconButton>
            </>
          }
        />

        {/* A) 4 ta plitka */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            label={t("rec.kpi.calls")}
            value={formatNumber(today?.calls ?? counts.all)}
            hint={callsPct === null ? undefined : t("rec.kpi.vsYesterday", { delta: `${callsPct > 0 ? "+" : ""}${callsPct}%` })}
            hintTone={callsPct === null ? "muted" : callsPct >= 0 ? "green" : "orange"}
          />
          <Tile
            label={t("rec.kpi.scored")}
            value={formatNumber(today?.scored ?? counts.scored)}
            hint={t("rec.kpi.ofTotal", { pct: scoredPct })}
            hintTone="muted"
          />
          <Tile
            label={t("rec.kpi.avg")}
            value={formatScore(today?.avg_score)}
            hint={scoreDiff === null ? undefined : t("rec.kpi.vsYesterday", { delta: `${scoreDiff > 0 ? "+" : ""}${scoreDiff.toFixed(1)}` })}
            hintTone={scoreDiff === null ? "muted" : scoreDiff >= 0 ? "green" : "orange"}
          />
          <Tile
            label={t("rec.kpi.attention")}
            value={formatNumber(today?.low_score ?? counts.low)}
            hint={t("rec.kpi.lowHint")}
            hintTone="muted"
            valueTone="orange"
          />
        </div>

        {/* B) Jadval kartasi */}
        <section className="overflow-hidden rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <SegmentedControl<Segment>
              value={segment}
              onChange={setSegment}
              options={[
                { value: "all", label: t("rec.seg.all"), count: counts.all },
                { value: "scored", label: t("rec.seg.scored"), count: counts.scored },
                { value: "unscored", label: t("rec.seg.unscored"), count: counts.unscored },
                { value: "low", label: t("rec.seg.low"), count: counts.low, countTone: "orange" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                aria-label={t("rec.allOperators")}
                className="h-11 rounded-xl px-3 text-sm"
                style={{ background: "var(--field)", border: "1px solid var(--border-control)", color: "var(--text)" }}
              >
                <option value="">{t("rec.allOperators")}</option>
                {operatorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--subtle)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("rec.searchPlaceholder")}
                  aria-label={t("rec.searchPlaceholder")}
                  className="h-11 w-[250px] rounded-xl pl-9 pr-3 text-sm"
                  style={{ background: "var(--field)", border: "1px solid var(--border-control)", color: "var(--text)" }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={60} />)}
            </div>
          ) : (
            <CallsTable calls={visible} managerName={nameOf} activeId={openId} onOpen={setOpenId} onPlay={playRow} />
          )}
        </section>
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
  );
}

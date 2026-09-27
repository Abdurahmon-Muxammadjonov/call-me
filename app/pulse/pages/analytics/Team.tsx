"use client";

/* Jamoa samaradorligi (§6.2, Main.dc.html): filtr (Hammasi / Orqada /
 * Normada), saralanadigan ustunlar (A11), dastlab 6 qator va "Yana N ta"
 * (D5), nom — `name ?? "Operator " + ext` (D6). Qator bosilsa — shu
 * operatorning bugungi audio yozuvlari. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ring } from "../../charts";
import { Button, ExtBadge, ScoreChip, Segmented, Skeleton, StatusPill } from "../../ui/primitives";
import { Cell, TableHead, TableRow, type Column, type SortDir } from "../../ui/table";
import { usePT } from "../../i18n";
import { DASH, fmtDec, fmtInt } from "../../lib/format";
import { scoreTone } from "../../lib/tones";
import type { AnalyticsData, TeamRow } from "../../data/analytics";

export type TeamFilter = "all" | "behind" | "ok";
export type TeamSortKey = "calls" | "long" | "dir" | "leads" | "score";

const TEMPLATE =
  "32px minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,0.8fr) minmax(0,0.9fr)";
const INITIAL_ROWS = 6;

export function parseSort(v: string | null): { key: TeamSortKey; dir: SortDir } {
  const [k, d] = (v ?? "").split(".");
  const keys: TeamSortKey[] = ["calls", "long", "dir", "leads", "score"];
  return {
    key: (keys as string[]).includes(k) ? (k as TeamSortKey) : "long",
    dir: d === "asc" ? "asc" : "desc",
  };
}

function sortValue(r: TeamRow, key: TeamSortKey): number {
  switch (key) {
    case "calls":
      return r.calls;
    case "long":
      return r.longCalls;
    case "dir":
      return r.calls ? r.incoming / r.calls : 0;
    case "leads":
      return r.leads ?? -1;
    case "score":
      return r.score10 ?? -1;
  }
}

export function TeamCard({
  data,
  loading,
  error,
  onRetry,
  filter,
  onFilter,
  sort,
  onSort,
  focusKey,
  onShowDay,
}: {
  data: AnalyticsData;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  filter: TeamFilter;
  onFilter: (f: TeamFilter) => void;
  sort: { key: TeamSortKey; dir: SortDir };
  onSort: (key: TeamSortKey) => void;
  focusKey: string | null;
  onShowDay: () => void;
}) {
  const t = usePT();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const norm = data.norms.dailyLongCallsNorm;
  const sec = data.norms.longCallSec;
  const rows = useMemo(() => data.team ?? [], [data.team]);
  const isOk = (r: TeamRow) => norm != null && r.longCalls >= norm;
  const counts = {
    all: rows.length,
    behind: norm == null ? 0 : rows.filter((r) => !isOk(r)).length,
    ok: norm == null ? 0 : rows.filter(isOk).length,
  };
  const filtered = rows.filter((r) => (filter === "behind" ? norm != null && !isOk(r) : filter === "ok" ? isOk(r) : true));
  const sorted = [...filtered].sort((a, b) => {
    const d = sortValue(a, sort.key) - sortValue(b, sort.key);
    return (sort.dir === "asc" ? d : -d) || b.calls - a.calls;
  });
  const focusIndex = focusKey ? sorted.findIndex((r) => r.key === focusKey || r.ext === focusKey) : -1;
  const showAll = expanded || focusIndex >= INITIAL_ROWS;
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_ROWS);
  const hidden = sorted.length - visible.length;

  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusKey) return;
    const el = cardRef.current?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(focusKey)}"]`);
    (el ?? cardRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }, [focusKey]);

  const columns: Column[] = [
    { key: "rank", label: "#" },
    { key: "operator", label: t("an.team.col.operator") },
    { key: "calls", label: t("an.team.col.calls"), sortable: true },
    { key: "long", label: t("an.team.col.long"), sortable: true },
    { key: "dir", label: t("an.team.col.dir"), sortable: true },
    { key: "leads", label: t("an.team.col.leads"), sortable: true },
    { key: "score", label: t("an.team.col.score"), sortable: true },
    { key: "status", label: t("an.team.col.status") },
  ];

  return (
    <section
      ref={cardRef}
      id="an-team"
      data-testid="AN-TEAM"
      className="overflow-hidden rounded-[26px] border border-pn-border bg-pn-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <h2 className="pn-card-title">{t("an.team.title")}</h2>
          {sec != null && norm != null && <p className="pn-card-sub">{t("an.team.sub", { sec, n: norm })}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          {data.team && norm != null && (
            <Segmented<TeamFilter>
              size="sm"
              inCard
              value={filter}
              onChange={onFilter}
              ariaLabel={t("an.team.filter")}
              testId="AN-11"
              options={[
                { value: "all", label: t("an.team.all", { n: counts.all }), testId: "AN-11-all" },
                { value: "behind", label: t("an.team.behind", { n: counts.behind }), testId: "AN-11-behind" },
                { value: "ok", label: t("an.team.ok", { n: counts.ok }), testId: "AN-11-ok" },
              ]}
            />
          )}
          <Button
            variant="outline"
            href="/dashboard/staff-stats"
            prefetch
            testId="AN-12"
            className="h-[42px]! border-pn-border-2! text-pn-text"
          >
            {t("an.team.staff")}
          </Button>
        </div>
      </div>

      {data.team == null && !loading && !error ? (
        <div className="flex flex-col items-start gap-3 border-t border-pn-border px-6 py-8">
          <p className="max-w-[640px] text-[14px] text-pn-muted">{t("an.team.periodOnlyDay")}</p>
          <Button variant="light" onClick={onShowDay} testId="AN-16">
            {t("an.team.toDay")}
          </Button>
        </div>
      ) : error && rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-pn-border px-6 py-8">
          <p className="text-[14px] text-pn-muted">{t("an.error")}</p>
          <Button variant="outline" compact onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div role="table" aria-label={t("an.team.title")} className="min-w-[1000px]">
            <TableHead
              columns={columns}
              template={TEMPLATE}
              sort={{ key: sort.key, dir: sort.dir }}
              onSort={(k) => onSort(k as TeamSortKey)}
            />
            {loading && rows.length === 0 ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex h-[58px] items-center gap-4 border-b border-pn-divider px-6">
                  <Skeleton w={18} h={12} />
                  <Skeleton w={44} h={32} r={10} />
                  <Skeleton w="40%" h={12} />
                </div>
              ))
            ) : sorted.length === 0 ? (
              <div className="px-6 py-10 text-center text-[14px] text-pn-muted">
                {rows.length === 0 ? t("an.team.empty") : t("an.team.emptyFilter")}
              </div>
            ) : (
              visible.map((r, i) => {
                const ok = isOk(r);
                const tone = norm == null ? "neutral" : ok ? "good" : "bad";
                const color = tone === "neutral" ? "var(--pn-text-2)" : tone === "good" ? "var(--pn-good)" : "var(--pn-bad)";
                const name = r.name ?? (r.ext ? t("operator.fallback", { ext: r.ext }) : t("operator.unmapped"));
                const sTone = scoreTone(r.score10, data.norms.targetScore10).tone;
                const inW = r.calls ? (r.incoming / r.calls) * 100 : 0;
                const focused = focusKey != null && (r.key === focusKey || r.ext === focusKey);
                return (
                  <div key={r.key} data-row-key={r.ext ?? r.key}>
                    <TableRow
                      template={TEMPLATE}
                      height={58}
                      selected={focused}
                      testId={`AN-14-${r.ext ?? r.key}`}
                      label={t("an.team.rowAria", { name, calls: r.calls })}
                      onActivate={() =>
                        router.push(
                          `/dashboard/recordings?operator=${encodeURIComponent(r.ext ?? r.key)}&date=${data.today}`
                        )
                      }
                    >
                      <Cell mono className="text-[13px] font-semibold text-pn-subtle">{i + 1}</Cell>
                      <Cell className="gap-3 text-[14px]">
                        <ExtBadge size="team" className="text-[12px]!">{r.ext ?? DASH}</ExtBadge>
                        <span className="truncate whitespace-nowrap">{name}</span>
                      </Cell>
                      <Cell mono className="text-[14px] text-pn-text-4">{fmtInt(r.calls)}</Cell>
                      <Cell className="gap-[10px]">
                        <Ring pct={norm ? (r.longCalls / norm) * 100 : 0} color={color} />
                        <span className="pn-mono text-[13px] font-semibold" style={{ color }}>
                          {fmtInt(r.longCalls)}
                          <span className="font-normal text-pn-subtle"> / {norm ?? DASH}</span>
                        </span>
                      </Cell>
                      <Cell className="gap-[10px]">
                        <span className="flex h-[6px] min-w-9 max-w-[84px] flex-1 overflow-hidden rounded-[3px] bg-pn-bar-dim" aria-hidden>
                          <span className="pn-grow h-full bg-pn-sky" style={{ width: `${inW.toFixed(1)}%` }} />
                        </span>
                        <span className="pn-mono whitespace-nowrap text-[12px] text-pn-text-3">
                          {fmtInt(r.incoming)} · {fmtInt(r.outgoing)}
                        </span>
                      </Cell>
                      <Cell mono className="text-[14px] text-pn-text-4">{fmtInt(r.leads)}</Cell>
                      <Cell>
                        <ScoreChip tone={sTone}>{r.score10 == null ? DASH : fmtDec(r.score10)}</ScoreChip>
                      </Cell>
                      <Cell>
                        {norm == null ? (
                          <span className="text-pn-faint">{DASH}</span>
                        ) : (
                          <StatusPill tone={ok ? "good" : "bad"}>{ok ? t("an.team.status.ok") : t("an.team.status.behind")}</StatusPill>
                        )}
                      </Cell>
                    </TableRow>
                  </div>
                );
              })
            )}
          </div>
          {(hidden > 0 || (expanded && sorted.length > INITIAL_ROWS)) && (
            <button
              type="button"
              data-testid="AN-15"
              onClick={() => setExpanded((v) => !v)}
              className="pn-press flex h-[52px] w-full items-center justify-center text-[13px] font-medium text-pn-muted hover:text-pn-text"
            >
              {hidden > 0 ? t("an.team.more", { n: hidden }) : t("an.team.less")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

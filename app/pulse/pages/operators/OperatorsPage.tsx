"use client";

/* OPERATORLAR — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski sahifa (ManagersDashboard) faqat amoCRM menejerlari ro'yxati va
 * holatini ko'rsatardi — u saqlangan (Supabase realtime bilan yangilanadi).
 * Qo'shimcha: "📅 Sana" bo'yicha har operatorning o'sha kungi qo'ng'iroqlari,
 * uzun qo'ng'iroq / norma, gaplashuv va ball (/analytics/operators). */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, ExtBadge, ScoreChip, Skeleton, StatusPill } from "../../ui/primitives";
import { Ring } from "../../charts";
import { Icon } from "../../ui/Icon";
import { DateButton } from "../../ui/DateButton";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useOperatorDay } from "../../data/dayCalls";
import { useManagerList, withRosterOps } from "../../data/roster";
import { useUrlState } from "../../shell/useUrlState";
import { FilterBar } from "../../ui/FilterBar";
import { listEmployees } from "../../../lib/store";
import { apiFetch } from "../../data/api";
import { getSupabase } from "../../../lib/supabase";
import { scoreTone, TONE_VARS, type Tone } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, hoursMinutes, type Loc } from "../../lib/dates";

interface CrmManager { id: string; name: string; status: string }
interface CrmDashboard { managers?: CrmManager[]; managers_count?: number; active_count?: number }

function statusOf(s: string): { tone: Tone; key: "online" | "away" | "offline" } {
  const v = s.toLowerCase();
  if (v === "active" || v === "online") return { tone: "good", key: "online" };
  if (v === "busy" || v === "away") return { tone: "warn", key: "away" };
  return { tone: "neutral", key: "offline" };
}

export function OperatorsPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const qc = useQueryClient();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const ops = useOperatorDay(me?.company.id, sel.date);
  const roster = useManagerList(me?.company.id);
  // Qaysi operatorning akkaunti bor (users.operator_ext) — kartada belgi.
  const accounts = useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/users?role=user"],
    queryFn: ({ signal }) => listEmployees(signal, "user"),
    enabled: !!me,
    staleTime: 30_000,
  });
  const accountByExt = new Map((accounts.data ?? []).filter((u) => u.operatorExt).map((u) => [u.operatorExt as string, u]));
  const url = useUrlState();
  const OP_FILTERS = ["all", "active", "ok", "behind", "idle"] as const;
  type OpFilter = (typeof OP_FILTERS)[number];
  const f = (OP_FILTERS as readonly string[]).includes(url.get("f") ?? "") ? (url.get("f") as OpFilter) : "all";
  const q = (url.get("q") ?? "").trim().toLowerCase();
  const crmKey = ["v1", me?.company.id ?? "_", "/crm/dashboard/managers"] as const;
  const crm = useQuery({
    queryKey: crmKey,
    // Eski sahifadagidek: amoCRM sinxroni sekin bo'lishi mumkin.
    queryFn: ({ signal }) => apiFetch<CrmDashboard>("/crm/dashboard/managers", { signal, raw: true }),
    enabled: !!me,
    staleTime: 60_000,
  });

  // Realtime: managers jadvali o'zgarsa ro'yxat yangilanadi (eski sahifadagidek).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const ch = supabase
      .channel("pulse-operators")
      .on("postgres_changes", { event: "*", schema: "public", table: "managers" }, () => void qc.invalidateQueries({ queryKey: crmKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, me?.company.id]);

  const norm = me?.norms.dailyLongCallsNorm ?? null;
  const target = me?.norms.targetScore10 ?? null;
  // Operatorlar DOIM ko'rinadi: doimiy ro'yxat + o'sha kungi ko'rsatkichlar
  // (qo'ng'iroq qilmaganlar nol bilan) — data/roster.model.ts.
  const rows = useMemo(
    () => withRosterOps((ops.data ?? []).filter((o) => o.key !== "—"), roster.data),
    [ops.data, roster.data]
  );
  const loaded = !!ops.data || !!roster.data;
  const isOk = (o: (typeof rows)[number]) => norm != null && o.calls > 0 && o.longCalls >= norm;
  const isBehind = (o: (typeof rows)[number]) => norm != null && o.calls > 0 && o.longCalls < norm;
  const counts: Record<OpFilter, number> = {
    all: rows.length,
    active: rows.filter((o) => o.calls > 0).length,
    ok: rows.filter(isOk).length,
    behind: rows.filter(isBehind).length,
    idle: rows.filter((o) => o.calls === 0).length,
  };
  const shown = rows
    .filter((o) => f === "all" || (f === "active" ? o.calls > 0 : f === "ok" ? isOk(o) : f === "behind" ? isBehind(o) : o.calls === 0))
    .filter((o) => !q || `${o.name ?? ""} ${o.ext ?? ""}`.toLowerCase().includes(q));
  const active = rows.filter((o) => o.calls > 0).length;
  const meeting = norm != null ? rows.filter((o) => o.longCalls >= norm).length : null;
  const managers = crm.data?.managers ?? [];
  const crmActive = typeof crm.data?.active_count === "number" ? crm.data.active_count : managers.filter((m) => statusOf(m.status).key === "online").length;

  return (
    <div className="@container/op flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{dayMonth(loc, sel.date)}</span>}
        title={t("op.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="OP-DATE" />
            <HeaderBell />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 @min-[700px]/op:grid-cols-3">
        {[
          { label: t("op.stat.ops"), value: fmtInt(rows.length) },
          { label: t("op.stat.active"), value: fmtInt(active) },
          { label: t("op.stat.norm"), value: meeting == null ? DASH : `${meeting} / ${active}` },
        ].map((x) => (
          <Card pad="tile" key={x.label}>
            <div className="text-[13px] text-pn-muted">{x.label}</div>
            <div className="pn-display mt-2 text-[30px] leading-none">{x.value}</div>
          </Card>
        ))}
      </div>

      <Card pad="none" className="overflow-hidden" data-testid="OP-DAY">
        <div className="flex flex-col gap-4 px-6 pt-[22px] pb-4">
          <div>
            <h2 className="pn-card-title">{t("op.day.title", { date: dayMonth(loc, sel.date) })}</h2>
            <div className="mt-1 text-[13px] text-pn-muted">{norm != null ? t("op.day.sub", { n: norm }) : t("op.day.subNoNorm")}</div>
          </div>
          <FilterBar<OpFilter>
            ariaLabel={t("filter.label")}
            testId="OP-F"
            value={f}
            onChange={(v) => url.set({ f: v === "all" ? null : v })}
            options={[
              { value: "all", label: t("filter.all"), count: counts.all },
              { value: "active", label: t("op.f.active"), count: counts.active },
              ...(norm != null
                ? [
                    { value: "ok" as const, label: t("ctl.rop.ok"), count: counts.ok },
                    { value: "behind" as const, label: t("ctl.rop.behind"), count: counts.behind },
                  ]
                : []),
              { value: "idle", label: t("op.noCalls"), count: counts.idle },
            ]}
            search={{ value: url.get("q") ?? "", onChange: (v) => url.set({ q: v || null }), placeholder: t("op.f.search") }}
          />
        </div>
        {ops.isError && <div className="px-6 pb-4 text-[13px] text-pn-bad-text">{t("op.day.error")}</div>}
        {!loaded ? (
          <div className="grid grid-cols-1 gap-3 px-6 pb-6 @min-[700px]/op:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-[18px]" />)}</div>
        ) : shown.length === 0 ? (
          <div className="px-6 pb-8 text-[14px] text-pn-muted">{rows.length === 0 ? t("op.day.empty") : t("filter.none")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 px-6 pb-6 @min-[640px]/op:grid-cols-2 @min-[1100px]/op:grid-cols-3">
            {shown.map((o) => {
              const ok = norm != null ? o.longCalls >= norm : null;
              const st = scoreTone(o.score10, target);
              return (
                <Link
                  key={o.key}
                  href={`/dashboard/recordings?operator=${encodeURIComponent(o.ext ?? o.key)}&date=${sel.date}`}
                  className={`flex flex-col gap-4 rounded-[18px] border border-pn-border bg-pn-panel-2 px-4 py-4 transition-colors hover:border-pn-border-3 ${o.calls === 0 ? "opacity-60 hover:opacity-100" : ""}`}
                  data-testid={`OP-CARD-${o.key}`}
                >
                  <div className="flex items-center gap-3">
                    <ExtBadge size="card">{o.ext ?? "—"}</ExtBadge>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{o.name ?? `Operator ${o.ext ?? ""}`}</span>
                    {o.calls === 0 ? (
                      <StatusPill tone="neutral" plain>{t("op.noCalls")}</StatusPill>
                    ) : (
                      ok != null && <StatusPill tone={ok ? "good" : "bad"} plain>{ok ? t("ctl.rop.ok") : t("ctl.rop.behind")}</StatusPill>
                    )}
                  </div>
                  {accounts.data && o.ext && (
                    <div className="-mt-2 flex items-center gap-2 text-[12px]">
                      {accountByExt.has(o.ext) ? (
                        <span className="flex min-w-0 items-center gap-1 text-pn-good-text"><Icon name="check" size={12} /> <span className="truncate">{accountByExt.get(o.ext)!.email}</span></span>
                      ) : (
                        <span className="text-pn-subtle">{t("op.noAccount")}</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-2 text-[12px]">
                    <div><div className="text-pn-muted">{t("op.calls")}</div><div className="pn-mono mt-1 text-[15px] font-semibold">{fmtInt(o.calls)}</div></div>
                    <div className="flex items-center gap-2">
                      <Ring size={28} r={11} stroke={4} pct={norm ? (o.longCalls / norm) * 100 : 0} color={TONE_VARS[ok == null ? "neutral" : ok ? "good" : "bad"].fg} />
                      <div><div className="text-pn-muted">{t("op.long")}</div><div className="pn-mono text-[13px] font-semibold">{o.longCalls}/{norm ?? DASH}</div></div>
                    </div>
                    <div><div className="text-pn-muted">{t("op.talk")}</div><div className="pn-mono mt-1 text-[13px] font-semibold">{hoursMinutes(o.talkSec)}</div></div>
                    <div className="flex flex-col items-end"><div className="text-pn-muted">{t("op.score")}</div><ScoreChip tone={st.tone} className="mt-1">{o.score10 == null ? DASH : fmtDec(o.score10)}</ScoreChip></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card pad="none" className="overflow-hidden" data-testid="OP-CRM">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-[22px] pb-4">
          <div>
            <h2 className="pn-card-title">{t("op.crm.title")}</h2>
            <div className="mt-1 text-[13px] text-pn-muted">{t("op.crm.sub")}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="good" plain>{t("op.crm.active", { n: crmActive })}</StatusPill>
            <StatusPill tone="neutral" plain>{t("op.crm.total", { n: crm.data?.managers_count ?? managers.length })}</StatusPill>
            <Button variant="outline" compact icon="chevronsUpDown" loading={crm.isFetching} onClick={() => void crm.refetch()} testId="OP-CRM-refresh">
              {t("op.crm.refresh")}
            </Button>
          </div>
        </div>
        {crm.isError ? (
          <div className="px-6 pb-6 text-[13px] text-pn-bad-text">{(crm.error as Error)?.message || t("op.crm.error")}</div>
        ) : !crm.data ? (
          <div className="px-6 pb-6 text-[13px] text-pn-muted">{t("op.crm.loading")}</div>
        ) : managers.length === 0 ? (
          <div className="px-6 pb-6 text-[13px] text-pn-muted">{t("op.crm.empty")}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 px-6 pb-6 @min-[700px]/op:grid-cols-2 @min-[1100px]/op:grid-cols-3">
            {managers.map((m) => {
              const s = statusOf(m.status);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-pn-panel-2 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pn-panel-3 text-[12px] font-bold">
                      {m.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                    </span>
                    <span className="truncate text-[14px]">{m.name}</span>
                  </span>
                  <StatusPill tone={s.tone}>{t(`op.status.${s.key}` as "op.status.online")}</StatusPill>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

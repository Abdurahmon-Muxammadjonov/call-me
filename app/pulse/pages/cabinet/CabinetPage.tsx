"use client";

/* XODIM (OPERATOR) KABINETI — Pulse Noir, 2026-10-15.
 *
 * Foydalanuvchi talabi: telefondan kelgan har bir menejerning o'z akkaunti
 * bo'lsin; u kirganda o'z skriptlarini ("qanday gaplashish kerak"), o'z
 * audiolari va tahlilini, yaxshi ishlashi uchun maslahat va yechimlarni
 * ko'rsin. Boshqa xodimlarning ma'lumoti KO'RINMAYDI — backend xodim
 * tokenini uning ichki raqamiga cheklaydi (lib/operatorScope.ts).
 *
 * Bo'limlar (URL: /cabinet, /cabinet/calls, /cabinet/guide, /cabinet/advice):
 *   Natijam · Qo'ng'iroqlarim · Qanday gaplashish kerak · Maslahatlar.
 * Hamma bo'limda "📅 Sana" — tanlangan kunning natijasi. */

import { useState } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, ScoreChip, Skeleton, StatusPill } from "../../ui/primitives";
import { Icon, type IconName } from "../../ui/Icon";
import { Notice } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { FilterBar } from "../../ui/FilterBar";
import { Ring } from "../../charts";
import { ThemeButton } from "../../shell/ThemeButton";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useUrlState } from "../../shell/useUrlState";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useCallsPage, type CallFilter } from "../../data/calls";
import { useMyGuide, useMyOperator, useMySummary } from "../../data/cabinet";
import { CallTable } from "../calls/CallTable";
import { CallDetail } from "../calls/CallDetail";
import { pctTone, scoreTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, hoursMinutes, type Loc } from "../../lib/dates";
import type { CallRow } from "../../../lib/calls";
import { solutionFor } from "./solutions";

export type CabinetTab = "overview" | "calls" | "guide" | "advice";
export const CABINET_TABS: ReadonlyArray<{ id: CabinetTab; path: string; icon: IconName }> = [
  { id: "overview", path: "", icon: "grid" },
  { id: "calls", path: "calls", icon: "wave" },
  { id: "guide", path: "guide", icon: "checkSquare" },
  { id: "advice", path: "advice", icon: "sparkle" },
];

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export function CabinetPage({ tab, onTab, onLogout }: { tab: CabinetTab; onTab: (t: CabinetTab) => void; onLogout: () => void }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const me = useMyOperator();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const op = me.data;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col gap-5 px-4 py-4 lg:px-8 lg:py-6">
      {/* Yuqori qator: logotip, kim, sana, mavzu, chiqish */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-pn-accent text-pn-accent-ink"><Icon name="pulse" size={20} /></span>
          <span>
            <span className="pn-display block text-[18px] leading-tight tracking-[-0.02em]">{t("brand.name")}</span>
            <span className="pn-eyebrow">{t("cab.eyebrow")}</span>
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="CAB-DATE" />
          <ThemeButton />
          <Button variant="outline" compact icon="logout" onClick={onLogout} testId="CAB-LOGOUT">{t("cab.logout")}</Button>
        </span>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="min-w-0">
          <div className="pn-eyebrow">{sel.isToday ? t("date.today") : dayMonth(loc, sel.date)}</div>
          <h1 className="pn-h1 flex flex-wrap items-center gap-3 text-pn-text">
            {op?.name ?? (me.isPending ? "…" : DASH)}
            {op?.operator_ext && <span className="pn-mono rounded-xl bg-pn-panel-3 px-3 py-1 text-[18px] font-semibold text-pn-text-2">{op.operator_ext}</span>}
          </h1>
          {op && (op.shift_start || op.shift_end) && (
            <p className="pn-page-sub flex items-center gap-2"><Icon name="clock" size={14} /> {t("cab.shift", { from: op.shift_start ?? "—", to: op.shift_end ?? "—" })}</p>
          )}
        </div>
        <nav aria-label={t("cab.nav")} className="flex flex-wrap gap-1 rounded-full border border-pn-border bg-pn-panel p-1">
          {CABINET_TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => onTab(x.id)}
              aria-current={tab === x.id ? "page" : undefined}
              data-testid={`CAB-TAB-${x.id}`}
              className={cx(
                "pn-press inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium",
                tab === x.id ? "bg-pn-seg-active-bg text-pn-seg-active-text" : "text-pn-text-2 hover:text-pn-text"
              )}
            >
              <Icon name={x.icon} size={15} /> {t(`cab.tab.${x.id}` as "cab.tab.overview")}
            </button>
          ))}
        </nav>
      </div>

      {me.data && !me.data.operator_ext && <Notice tone="warn" testId="CAB-UNLINKED">{t("cab.unlinked")}</Notice>}

      {tab === "overview" && <Overview date={sel.date} onTab={onTab} />}
      {tab === "calls" && <MyCalls date={sel.date} />}
      {tab === "guide" && <Guide />}
      {tab === "advice" && <Advice date={sel.date} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Natijam */

function Tile({ label, children, testId }: { label: string; children: React.ReactNode; testId: string }) {
  return (
    <Card pad="tile" className="flex min-w-0 flex-col gap-3" data-testid={testId}>
      <span className="truncate text-[13px] text-pn-muted">{label}</span>
      {children}
    </Card>
  );
}

function Overview({ date, onTab }: { date: string; onTab: (t: CabinetTab) => void }) {
  const t = usePT();
  const { data: meCo } = useMe();
  const q = useMySummary(date);
  const s = q.data?.data;
  const day = s?.day;
  const staff = s?.staff;
  const norm = s?.norm ?? null;
  const target = meCo?.norms.targetScore10 ?? null;
  const s10 = day?.score10 ?? null;
  const st = scoreTone(s10, target);
  const longPct = norm ? Math.min(100, ((day?.longCalls ?? 0) / norm) * 100) : 0;

  if (q.isPending) return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={120} r={22} />)}</div>;
  if (q.isError) return <Notice tone="bad">{t("cab.error")}</Notice>;
  if (!q.data?.linked) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label={t("cab.calls")} testId="CAB-T-calls">
          <span className="pn-display text-[34px] leading-none">{fmtInt(day?.calls ?? 0)}</span>
          <span className="text-[12px] text-pn-subtle">{t("cab.inOut", { i: fmtInt(day?.incoming ?? 0), o: fmtInt(day?.outgoing ?? 0) })}</span>
        </Tile>
        <Tile label={t("cab.long", { s: s?.long_sec ?? 60 })} testId="CAB-T-long">
          <span className="flex items-center gap-3">
            <Ring size={44} r={18} stroke={6} pct={longPct} color={TONE_VARS[norm == null ? "neutral" : (day?.longCalls ?? 0) >= norm ? "good" : "bad"].fg} />
            <span className="pn-display text-[30px] leading-none">{fmtInt(day?.longCalls ?? 0)}<span className="text-[16px] text-pn-subtle"> / {norm ?? DASH}</span></span>
          </span>
        </Tile>
        <Tile label={t("cab.avg")} testId="CAB-T-avg">
          <span className="pn-display text-[34px] leading-none" style={{ color: s10 == null ? undefined : TONE_VARS[st.tone].text }}>{s10 == null ? DASH : fmtDec(s10)}</span>
          <span className="text-[12px] text-pn-subtle">{t("cab.scored", { n: fmtInt(day?.scored ?? 0) })}</span>
        </Tile>
        <Tile label={t("cab.talk")} testId="CAB-T-talk">
          <span className="pn-display text-[34px] leading-none">{hoursMinutes(day?.talkSec ?? 0)}</span>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="pn-card-title">{t("cab.stages")}</h2>
          <p className="pn-card-sub">{t("cab.stagesSub")}</p>
          {!staff?.stages.length ? (
            <p className="mt-6 text-[14px] text-pn-muted">{t("cab.noScored")}</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {staff.stages.map((x) => {
                const tone = pctTone(x.pct);
                return (
                  <li key={x.title}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate text-pn-text-2">{x.title}</span>
                      <span className="pn-mono shrink-0 font-semibold" style={{ color: TONE_VARS[tone].text }}>{x.pct}%</span>
                    </div>
                    <span className="block h-[6px] overflow-hidden rounded-full bg-pn-panel-3">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(2, x.pct)}%`, background: TONE_VARS[tone].fg }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="pn-card-title">{t("cab.mistakes")}</h2>
            <Button variant="link" iconRight="chevronRight" onClick={() => onTab("advice")}>{t("cab.toAdvice")}</Button>
          </div>
          {!staff?.top_mistakes.length ? (
            <p className="mt-6 text-[14px] text-pn-muted">{t("cab.noMistakes")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {staff.top_mistakes.map((m) => (
                <li key={m.label} className="flex items-center justify-between gap-3 rounded-2xl bg-pn-panel-2 px-4 py-3 text-[13px]">
                  <span className="min-w-0 text-pn-text-2">{m.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusPill tone="neutral" plain>×{m.count}</StatusPill>
                    <span className="pn-mono" style={{ color: TONE_VARS.bad.text }}>−{fmtDec(m.points_lost)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!!staff?.lost_reasons.length && (
            <>
              <p className="pn-section-label mt-5 text-pn-muted">{t("cab.lost")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {staff.lost_reasons.map((r) => <StatusPill key={r.reason} tone="bad" plain>{r.reason} · {r.count}</StatusPill>)}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Qo'ng'iroqlarim */

const CAB_FILTERS = ["all", "scored", "low", "problem", "unscored"] as const;
const PAGE = 12;

function MyCalls({ date }: { date: string }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: meCo } = useMe();
  const sum = useMySummary(date);
  const me = useMyOperator();
  const guide = useMyGuide();
  const criteria = guide.data?.criteria ?? [];
  const filter = ((CAB_FILTERS as readonly string[]).includes(url.get("f") ?? "") ? url.get("f") : "all") as CallFilter;
  const page = Math.max(0, Number(url.get("page")) || 0);
  const openId = url.get("open");
  const [autoPlay, setAutoPlay] = useState(false);
  const q = useCallsPage({ date, filter, page, pageSize: PAGE });
  const rows = q.data?.rows ?? [];
  const target = meCo?.norms.targetScore10 ?? null;
  const nameOf = (r: CallRow) => me.data?.name ?? (r.operator_ext ? `Operator ${r.operator_ext}` : "—");
  const set = (p: Record<string, string | null>) => url.set(p);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Card pad="none" className="min-w-0 overflow-hidden lg:flex-[1.6_1_0]">
        <div className="px-5 py-4">
          <FilterBar<(typeof CAB_FILTERS)[number]>
            ariaLabel={t("filter.label")}
            testId="CAB-F"
            value={filter as (typeof CAB_FILTERS)[number]}
            onChange={(v) => set({ f: v === "all" ? null : v, page: null, open: null })}
            options={CAB_FILTERS.map((x) => ({ value: x, label: t(`calls.f.${x}` as "calls.f.all") }))}
          />
        </div>
        <CallTable
          rows={rows}
          selectedId={openId}
          playingId={autoPlay ? openId : null}
          onSelect={(r) => { setAutoPlay(false); set({ open: r.id }); }}
          onPlay={(r) => { setAutoPlay(true); set({ open: r.id }); }}
          nameOf={nameOf}
          targetScore10={target}
          total={q.data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => set({ page: p ? String(p) : null })}
          loading={q.isLoading}
          emptyText={q.isError ? t("calls.error") : t("cab.noCalls")}
        />
      </Card>
      {openId && (
        <div className="min-w-0 lg:flex-[1_1_0]">
          <CallDetail
            key={openId}
            id={openId}
            name={me.data?.name ?? ""}
            dayAvg10={sum.data?.data?.day?.score10 ?? null}
            targetScore10={target}
            loc={loc}
            autoPlay={autoPlay}
            onClose={() => { setAutoPlay(false); set({ open: null }); }}
            deepLink={false}
            solutionFor={(m, newLead) => solutionFor(m, newLead, criteria)}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ Qanday gaplashish kerak */

function Guide() {
  const t = usePT();
  const q = useMyGuide();
  if (q.isPending) return <Skeleton h={300} r={26} />;
  if (q.isError) return <Notice tone="bad">{t("cab.error")}</Notice>;
  const groups = new Map<string, NonNullable<typeof q.data>["criteria"]>();
  for (const c of q.data.criteria) {
    const k = c.category?.trim() || t("cab.otherRules");
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  return (
    <div className="flex flex-col gap-4">
      {q.data.scripts.length > 0 && (
        <Card>
          <h2 className="pn-card-title">{t("cab.myScripts")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {q.data.scripts.map((s) => <StatusPill key={s.id} tone="good">{s.title}</StatusPill>)}
          </ul>
        </Card>
      )}
      <Notice tone="neutral" icon="info">{t("cab.guideHint")}</Notice>
      {[...groups.entries()].map(([cat, list]) => (
        <Card key={cat}>
          <h2 className="pn-card-title">{cat}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {list.map((c) => (
              <li key={c.id} className="rounded-2xl border border-pn-border-2 bg-pn-panel-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-pn-text">{c.title}</span>
                  {c.weight != null && <span className="pn-mono text-[12px] text-pn-subtle">{t("cab.weight", { n: c.weight })}</span>}
                </div>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-pn-text-2">{c.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      {groups.size === 0 && <Card className="text-[14px] text-pn-muted">{t("cab.noGuide")}</Card>}
    </div>
  );
}

/* ------------------------------------------------------------ Maslahatlar */

function Advice({ date }: { date: string }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const q = useMySummary(date);
  const guide = useMyGuide();
  const criteria = guide.data?.criteria ?? [];
  const s = q.data?.data;
  if (q.isPending) return <Skeleton h={300} r={26} />;
  if (q.isError) return <Notice tone="bad">{t("cab.error")}</Notice>;
  if (!q.data?.linked) return null;
  const staff = s?.staff;
  // Xato -> skriptdagi o'sha bosqich qoidasi (turi noma'lum: avval eski baza, keyin yangi lid).
  const fixOf = (label: string) => solutionFor(label, false, criteria) ?? solutionFor(label, true, criteria);
  const weak = (staff?.stages ?? []).filter((x) => x.pct < 70).slice(0, 4);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="pn-card-title flex items-center gap-2"><Icon name="sparkle" size={18} /> {t("cab.aiAdvice")}</h2>
          {s?.advice && <span className="text-[12px] text-pn-subtle">{t("cab.adviceBased", { n: s.advice.based_on_calls })}</span>}
        </div>
        {!s?.advice?.items.length ? (
          <p className="mt-4 text-[14px] text-pn-muted">{t("cab.noAdvice")}</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {s.advice.items.map((a, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-pn-panel-2 px-4 py-3">
                <span className="pn-mono grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pn-good-tint text-[12px] font-semibold text-pn-good-text">{i + 1}</span>
                <span className="text-[14px] leading-relaxed text-pn-text-2">{a}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card>
        <h2 className="pn-card-title">{t("cab.weak", { date: dayMonth(loc, date) })}</h2>
        {!staff?.faults.length && !weak.length ? (
          <p className="mt-4 text-[14px] text-pn-muted">{t("cab.noWeak")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {(staff?.faults ?? []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[14px] text-pn-text-2"><Icon name="warning" size={15} className="mt-[2px] shrink-0 text-pn-warn" /> {f}</li>
            ))}
            {weak.map((x) => (
              <li key={x.title} className="flex items-center justify-between gap-3 rounded-2xl bg-pn-panel-2 px-4 py-2 text-[13px]">
                <span className="text-pn-text-2">{x.title}</span>
                <ScoreChip tone={pctTone(x.pct)}>{x.pct}%</ScoreChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="pn-card-title">{t("cab.solutions")}</h2>
        <p className="pn-card-sub">{t("cab.solutionsSub")}</p>
        {!staff?.top_mistakes.length ? (
          <p className="mt-4 text-[14px] text-pn-muted">{t("cab.noMistakes")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {staff.top_mistakes.map((m) => (
              <li key={m.label} className="rounded-2xl border border-pn-border-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-semibold text-pn-text">{m.label}</span>
                  <span className="pn-mono shrink-0" style={{ color: TONE_VARS.bad.text }}>×{m.count} · −{fmtDec(m.points_lost)}</span>
                </div>
                {fixOf(m.label) ? (
                  <div className="mt-2 rounded-xl border-l-2 border-pn-good bg-pn-panel-2 px-3 py-2 text-[12px] leading-[1.5] text-pn-text-2">
                    <span className="font-semibold text-pn-good-text">{t("calls.howTo")}: </span>
                    {fixOf(m.label)}
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-pn-muted">{t("cab.solutionHint")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

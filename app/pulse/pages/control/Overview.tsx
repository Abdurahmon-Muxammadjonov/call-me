"use client";

/* Boshqaruv paneli — "Umumiy" tab (02-Boshqaruv.png, Boshqaruv.dc.html).
 * Hisoblar model.ts da; bu yerda faqat ko'rinish. */

import Link from "next/link";
import { usePT, type PT } from "../../i18n";
import { Card, DeltaPill, StatusPill } from "../../ui/primitives";
import { Icon, type IconName } from "../../ui/Icon";
import { Ring } from "../../charts";
import { indexTone, TONE_VARS, type Tone } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, type Loc } from "../../lib/dates";
import type { ControlPanel, OperatorDayRow } from "../../data/control";
import {
  load, lowerIsBetterTone, mmss, monthFunnel, negatives, pctChange, pulse, rings, score10Of, signals,
  type ControlNorms, type RingVal,
} from "./model";

function fmtPctDelta(v: number | null): string {
  if (v == null) return DASH;
  return `${Math.abs(v) < 10 ? Math.abs(v).toFixed(1) : Math.round(Math.abs(v))}%`;
}

/* ------------------------------------------------------------ Puls + halqalar */

function ringNote(t: PT, r: RingVal): string {
  if (r.key === "conversion") {
    if (r.vars.pct === DASH) return DASH;
    return r.vars.target === DASH ? t("ctl.ringNote.conversionNoTarget", r.vars) : t("ctl.ringNote.conversion", r.vars);
  }
  return t(`ctl.ringNote.${r.key}` as "ctl.ringNote.activity", r.vars);
}

export function PulseCard({ panel, ops, norms }: { panel: ControlPanel; ops: OperatorDayRow[] | null; norms: ControlNorms }) {
  const t = usePT();
  const rs = rings(panel.days[0], ops, norms);
  const p = pulse(rs);
  const tone = indexTone(p.value);
  const text =
    p.value == null
      ? t("ctl.pulse.empty")
      : p.weak && rs.find((r) => r.key === p.weak)!.value! >= 80
        ? t("ctl.pulse.allGood")
        : t("ctl.pulse.text", {
            strong: t(`ctl.ring.${p.strong}` as "ctl.ring.activity"),
            weak: t(`ctl.ringLow.${p.weak}` as "ctl.ringLow.activity"),
          });
  return (
    <Card pad="lg" className="flex flex-col gap-6 @min-[900px]/ctl:flex-row @min-[900px]/ctl:items-center @min-[900px]/ctl:gap-8" data-testid="CTL-PULSE">
      <div className="@min-[900px]/ctl:w-[290px] @min-[900px]/ctl:shrink-0">
        <div className="pn-eyebrow">{t("ctl.pulse.label")}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="pn-display text-[76px] leading-[0.9] tracking-[-0.045em]" data-testid="CTL-PULSE-value">
            {p.value ?? DASH}
          </span>
          <span className="text-[18px] text-pn-muted">/ 100</span>
          {p.value != null && (
            <StatusPill tone={tone.tone} plain className="ml-[6px] self-center">
              {t(`tone.${tone.label}` as "tone.average")}
            </StatusPill>
          )}
        </div>
        <p className="mt-[14px] text-[14px] leading-[1.5] text-pn-text-2">{text}</p>
      </div>
      <div className={`grid flex-1 grid-cols-2 gap-[14px] ${rs.length === 3 ? "@min-[700px]/ctl:grid-cols-3" : "@min-[700px]/ctl:grid-cols-4"}`}>
        {rs.map((r) => {
          const rt = indexTone(r.value);
          return (
            <div key={r.key} className="flex flex-col items-center gap-[10px] rounded-[20px] bg-pn-panel-2 px-[14px] py-4 text-center" data-testid={`CTL-RING-${r.key}`}>
              <div className="relative h-[92px] w-[92px]">
                <Ring size={92} r={38} stroke={9} pct={r.value ?? 0} color={TONE_VARS[rt.tone].fg} track="var(--pn-track)" />
                <div className="pn-display absolute inset-0 grid place-items-center text-[26px] tracking-[-0.03em]">
                  {r.value ?? DASH}
                </div>
              </div>
              <div>
                <div className="text-[14px] font-semibold">{t(`ctl.ring.${r.key}` as "ctl.ring.activity")}</div>
                <div className="mt-1 text-[12px] leading-[1.4] text-pn-muted">{ringNote(t, r)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ KPI plitkalari */

function KpiTile({
  icon,
  iconBg,
  iconFg,
  label,
  value,
  unit,
  delta,
  deltaTone,
  title,
  testId,
}: {
  icon: IconName;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  unit?: string;
  delta: string | null;
  deltaTone: Tone;
  title?: string;
  testId: string;
}) {
  return (
    <Card pad="tile" className="flex items-center gap-[14px]" data-testid={testId}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: iconBg, color: iconFg }}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-pn-muted" title={label}>{label}</div>
        <div className="mt-1 flex items-baseline gap-[6px]">
          <span className="pn-display text-[26px] leading-none tracking-[-0.02em]">{value}</span>
          {unit && <span className="text-[13px] text-pn-subtle">{unit}</span>}
        </div>
      </div>
      {delta != null && (
        <span title={title}>
          <DeltaPill tone={deltaTone}>{delta}</DeltaPill>
        </span>
      )}
    </Card>
  );
}

export function KpiRow({ panel, ops, norms }: { panel: ControlPanel; ops: OperatorDayRow[] | null; norms: ControlNorms }) {
  const t = usePT();
  const d = panel.days[0];
  const p = panel.days[1];
  const prevCalls = panel.prevSameTime ? panel.prevSameTime.calls : p?.calls ?? null;
  const callsDelta = prevCalls != null ? pctChange(d?.calls ?? 0, prevCalls) : null;
  const s10 = score10Of(d);
  const ps10 = score10Of(p);
  const qDelta = s10 != null && ps10 != null ? s10 - ps10 : null;
  const avg = d && d.calls ? d.seconds / d.calls : null;
  const pavg = p && p.calls ? p.seconds / p.calls : null;
  const durDelta = avg != null && pavg != null ? avg - pavg : null;
  const active = ops ? ops.filter((o) => o.key !== "—" && o.calls > 0).length : null;
  const total = Math.max(norms.operatorCount ?? 0, active ?? 0);
  const cmpTitle = panel.prevSameTime ? t("ctl.kpi.vsSameTime", { hm: panel.prevSameTime.hm }) : t("ctl.kpi.vsPrevDay");
  return (
    <div className="grid grid-cols-1 gap-4 @min-[560px]/ctl:grid-cols-2 @min-[1100px]/ctl:grid-cols-4">
      <KpiTile
        icon="phone" iconBg="var(--pn-accent-soft)" iconFg="var(--pn-accent-strong, var(--pn-accent))"
        label={t("ctl.kpi.calls")} value={fmtInt(d?.calls ?? 0)} unit={t("ctl.kpi.unitCalls")}
        delta={callsDelta == null ? null : `${callsDelta >= 0 ? "↑" : "↓"} ${fmtPctDelta(callsDelta)}`}
        deltaTone={callsDelta == null ? "neutral" : callsDelta >= 0 ? "good" : "bad"} title={cmpTitle} testId="CTL-KPI-calls"
      />
      <KpiTile
        icon="shieldCheck" iconBg="color-mix(in srgb, var(--pn-lilac) 14%, transparent)" iconFg="var(--pn-lilac-line)"
        label={t("ctl.kpi.quality")} value={s10 == null ? DASH : fmtDec(s10)} unit="/ 10"
        delta={qDelta == null ? null : `${qDelta >= 0 ? "↑" : "↓"} ${fmtDec(Math.abs(qDelta))}`}
        deltaTone={qDelta == null ? "neutral" : qDelta >= 0 ? "good" : "bad"} title={t("ctl.kpi.vsPrevDay")} testId="CTL-KPI-quality"
      />
      <KpiTile
        icon="clock" iconBg="color-mix(in srgb, var(--pn-sky) 14%, transparent)" iconFg="var(--pn-sky-line)"
        label={t("ctl.kpi.duration")} value={mmss(avg)} unit={t("ctl.kpi.unitMin")}
        delta={durDelta == null ? null : `${durDelta >= 0 ? "↑" : "↓"} ${mmss(durDelta)}`}
        deltaTone={durDelta == null ? "neutral" : durDelta >= 0 ? "good" : "bad"} title={t("ctl.kpi.vsPrevDay")} testId="CTL-KPI-duration"
      />
      <KpiTile
        icon="users" iconBg="color-mix(in srgb, var(--pn-peach) 14%, transparent)" iconFg="var(--pn-peach-line)"
        label={t("ctl.kpi.active")} value={active == null ? DASH : `${active} / ${total}`}
        delta={active == null ? null : active >= total ? t("ctl.kpi.all") : t("ctl.kpi.inactive", { n: total - active })}
        deltaTone={active == null ? "neutral" : active >= total ? "good" : "warn"} testId="CTL-KPI-active"
      />
    </div>
  );
}

/* ------------------------------------------------------------ Salbiy holatlar */

export function NegativesCard({ panel }: { panel: ControlPanel }) {
  const t = usePT();
  const rows = negatives(panel.days);
  return (
    <Card className="flex min-w-0 flex-col @min-[1100px]/ctl:flex-[1.35_1_0]" data-testid="CTL-NEG">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <h2 className="pn-card-title">{t("ctl.neg.title")}</h2>
          <div className="mt-1 text-[13px] text-pn-muted">{t("ctl.neg.sub")}</div>
        </div>
        <div className="pn-eyebrow hidden grid-cols-[80px_80px] gap-x-2 text-center text-[11px] @min-[640px]/ctl:grid">
          <span>{t("ctl.neg.day")}</span>
          <span>{t("ctl.neg.week")}</span>
        </div>
      </div>
      {rows.map((r) => {
        const max = Math.max(1, ...r.series);
        const dTone = lowerIsBetterTone(r.dayDelta);
        const wTone = lowerIsBetterTone(r.weekDelta);
        return (
          <div
            key={r.key}
            data-testid={`CTL-NEG-${r.key}`}
            className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 border-t border-pn-divider py-3 @min-[640px]/ctl:grid-cols-[minmax(0,1fr)_140px_168px]"
          >
            <div className="min-w-0">
              <div className="text-[14px] leading-tight text-pn-text-2 @min-[640px]/ctl:truncate">{t(`ctl.neg.${r.key}` as "ctl.neg.short")}</div>
              <div className="pn-display mt-[6px] text-[24px] leading-none tracking-[-0.02em]">{fmtInt(r.value)}</div>
            </div>
            <div className="hidden h-10 items-end gap-[6px] @min-[640px]/ctl:flex" aria-hidden>
              {r.series.map((v, i) => (
                <div
                  key={i}
                  className="pn-bar w-[14px] rounded-t-[4px] rounded-b-[2px]"
                  style={{
                    height: Math.max(3, Math.round((v / max) * 40)),
                    background: i === r.series.length - 1 ? TONE_VARS[dTone === "neutral" ? "neutral" : dTone].fg : "var(--pn-bar-dim)",
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-[80px_80px] gap-x-2">
              <DeltaPill tone={dTone} className="justify-center" arrow={r.dayDelta == null ? null : r.dayDelta > 0 ? "up" : "down"}>
                {fmtPctDelta(r.dayDelta)}
              </DeltaPill>
              <DeltaPill tone={wTone} className="justify-center" arrow={r.weekDelta == null ? null : r.weekDelta > 0 ? "up" : "down"}>
                {fmtPctDelta(r.weekDelta)}
              </DeltaPill>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ------------------------------------------------------------ Yuklama */

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function LoadCard({ panel, live, nowHour }: { panel: ControlPanel; live: boolean; nowHour: number }) {
  const t = usePT();
  const l = load(panel.hours, live, nowHour);
  const max = Math.max(1, ...l.bars.map((b) => b.calls ?? 0));
  const maxSlot = Math.max(1, ...l.slots.map((s) => s.calls));
  const slotLabel = (s: { from: number; to: number }) => `${hh(s.from)}–${hh(s.to)}`;
  return (
    <Card className="flex min-w-0 flex-col gap-4 @min-[1100px]/ctl:flex-[1_1_0]" data-testid="CTL-LOAD">
      <div>
        <h2 className="pn-card-title">{t("ctl.load.title")}</h2>
        <div className="mt-1 text-[13px] text-pn-muted">
          {l.total === 0 || !l.topSlot || !l.peak ? t("ctl.load.empty") : t("ctl.load.sub", { slot: slotLabel(l.topSlot), hour: hh(l.peak.hour) })}
        </div>
      </div>
      <div className="flex flex-col gap-[6px]" role="img" aria-label={t("ctl.load.aria")}>
        <div className="flex h-[84px] items-end justify-between gap-1">
          {l.bars.map((b) => {
            const peak = l.peak?.hour === b.hour;
            const v = b.calls ?? 0;
            return (
              <div
                key={b.hour}
                title={b.calls == null ? undefined : `${hh(b.hour)} · ${b.calls}`}
                className="pn-bar flex-1 rounded-t-[6px] rounded-b-[2px]"
                style={{
                  maxWidth: 22,
                  height: b.calls == null ? 4 : Math.max(4, Math.round((v / max) * 84)),
                  background:
                    b.calls == null
                      ? "var(--pn-panel-3)"
                      : peak
                        ? "var(--pn-accent)"
                        : `color-mix(in srgb, var(--pn-text-3) ${Math.round(18 + (v / max) * 40)}%, transparent)`,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between gap-1">
          {l.bars.map((b) => (
            <span
              key={b.hour}
              className="pn-mono flex-1 text-center text-[10px]"
              style={{ maxWidth: 22, color: l.peak?.hour === b.hour ? "var(--pn-text)" : "var(--pn-subtle)" }}
            >
              {String(b.hour).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-[9px]">
        {l.slots.map((s) => (
          <div key={s.from} className="pn-mono grid grid-cols-[52px_minmax(0,1fr)_40px_48px] items-center gap-x-[10px] text-[12px]">
            <span className="text-pn-muted">{`${String(s.from).padStart(2, "0")}–${String(s.to).padStart(2, "0")}`}</span>
            <div className="h-2 overflow-hidden rounded bg-pn-panel-3">
              <div
                className="pn-grow h-2 rounded"
                style={{ width: `${(s.calls / maxSlot) * 100}%`, background: s.calls === maxSlot && s.calls > 0 ? "var(--pn-accent)" : "var(--pn-border-3)" }}
              />
            </div>
            <span className="text-right font-semibold text-pn-text">{fmtInt(s.calls)}</span>
            <span className="text-right text-pn-subtle">{l.total ? `${fmtDec(s.share)}%` : DASH}</span>
          </div>
        ))}
      </div>
      {l.topSlot && l.total > 0 && (
        <div className="mt-auto flex items-center gap-[10px] rounded-[14px] bg-pn-panel-2 px-[14px] py-[11px] text-[13px] leading-[1.4] text-pn-text-2">
          <span className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-pn-accent-soft px-2 text-[11px] font-bold tracking-[0.04em] text-pn-accent-strong">
            {t("ctl.load.hintChip")}
          </span>
          <span>{t("ctl.load.hint", { pct: Math.round(l.topShare), slot: slotLabel(l.topSlot) })}</span>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ Voronka (oy boshidan) */

const FUNNEL_FILL = ["var(--pn-sky)", "var(--pn-periwinkle)", "var(--pn-lilac)", "var(--pn-peach)", "var(--pn-good)"];

export function MonthFunnelCard({ panel, loc }: { panel: ControlPanel; loc: Loc }) {
  const t = usePT();
  const f = monthFunnel(panel.month);
  const top = Math.max(1, f.stages[0].value);
  return (
    <Card className="flex min-w-0 flex-col gap-[14px] @min-[1100px]/ctl:flex-[1.35_1_0]" data-testid="CTL-FUNNEL">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="pn-card-title">{t("ctl.funnel.title")}</h2>
          <div className="mt-1 text-[13px] text-pn-muted">{t("ctl.funnel.sub", { date: dayMonth(loc, panel.month.to) })}</div>
        </div>
        <div className="text-right">
          <div className="pn-display text-[28px] leading-none tracking-[-0.02em] text-pn-good">
            {f.overall == null ? DASH : `${fmtDec(f.overall)}%`}
          </div>
          <div className="mt-1 text-[12px] text-pn-muted">{t("ctl.funnel.overall")}</div>
        </div>
      </div>
      {/* Tor ekranda — gorizontal chiziqlar (ustunlar siqilib raqam kesilmasin). */}
      <div className="flex flex-col gap-[10px] @min-[640px]/ctl:hidden">
        {f.stages.map((s, i) => (
          <div key={s.key} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3">
            <span className="truncate text-[12px] text-pn-muted">{t(`ctl.funnel.${s.key}` as "ctl.funnel.calls")}</span>
            <div className="h-[26px] overflow-hidden rounded-[8px] bg-pn-panel-3">
              <div className="pn-grow h-full rounded-[8px]" style={{ width: `${Math.max(2, (s.value / top) * 100)}%`, background: FUNNEL_FILL[i] }} />
            </div>
            <span className="pn-mono min-w-[64px] text-right text-[13px]">
              <span className="font-semibold">{fmtInt(s.value)}</span>
              {i > 0 && <span className="ml-1 text-[11px] text-pn-subtle">{s.conv == null ? DASH : `${Math.round(s.conv)}%`}</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="hidden min-h-[180px] flex-1 items-end @min-[640px]/ctl:flex">
        {f.stages.map((s, i) => (
          <div key={s.key} className="contents">
            {i > 0 && (
              <div className="flex w-12 shrink-0 flex-col items-center gap-1 pb-[18px]">
                <span className="pn-mono text-[12px] font-semibold" style={{ color: s.conv == null ? "var(--pn-subtle)" : s.conv < 60 ? "var(--pn-bad)" : "var(--pn-good)" }}>
                  {s.conv == null ? DASH : `${Math.round(s.conv)}%`}
                </span>
                <Icon name="transfer" size={16} className="text-pn-faint" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 basis-0 flex-col gap-2">
              <span className="truncate text-[12px] text-pn-muted">{t(`ctl.funnel.${s.key}` as "ctl.funnel.calls")}</span>
              <div
                className="pn-grow flex items-end rounded-[14px] px-3 py-[10px] text-pn-pastel-ink"
                style={{ height: Math.round(64 + (s.value / top) * 116), background: FUNNEL_FILL[i] }}
              >
                <span className="pn-display text-[24px] leading-none tracking-[-0.02em]">{fmtInt(s.value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ Signallar */

export function SignalsCard({
  panel,
  ops,
  norms,
  loc,
}: {
  panel: ControlPanel;
  ops: OperatorDayRow[] | null;
  norms: ControlNorms;
  loc: Loc;
}) {
  const t = usePT();
  const prevCalls = panel.prevSameTime ? panel.prevSameTime.calls : panel.days[1]?.calls ?? null;
  const list = signals(panel.days, ops, norms, panel.long_call_seconds, panel.date, prevCalls);
  return (
    <Card className="flex min-w-0 flex-col pb-3 @min-[1100px]/ctl:flex-[1_1_0]" data-testid="CTL-SIGNALS">
      <div className="mb-[6px] flex items-baseline justify-between">
        <h2 className="pn-card-title">
          {t("ctl.sig.title")} · <span className="text-pn-muted">{dayMonth(loc, panel.date)}</span>
        </h2>
        <Link href={`/dashboard/analysis-status?date=${panel.date}`} className="text-[13px] text-pn-text-2 hover:text-pn-text">
          {t("ctl.sig.all")} →
        </Link>
      </div>
      {list.map((s) => {
        const tv = TONE_VARS[s.tone];
        const desc =
          s.key === "lagging" && Number(s.vars.more) > 0 ? t("ctl.sig.lagging.dMore", s.vars) : t(`ctl.sig.${s.key}.d` as "ctl.sig.allGood.d", s.vars);
        const body = (
          <>
            <span className="mt-[5px] h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: tv.fg, boxShadow: `0 0 0 4px ${tv.ring}` }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{t(`ctl.sig.${s.key}.t` as "ctl.sig.allGood.t", s.vars)}</span>
              <span className="mt-[3px] block text-[12px] leading-[1.4] text-pn-muted">{desc}</span>
            </span>
            <span className="pn-mono mt-px whitespace-nowrap text-[13px] font-semibold" style={{ color: tv.text }}>{s.metric}</span>
          </>
        );
        return s.href ? (
          <Link key={s.key} href={s.href} data-testid={`CTL-SIG-${s.key}`} className="flex items-start gap-3 border-t border-pn-divider py-3 text-pn-text hover:opacity-90">
            {body}
          </Link>
        ) : (
          <div key={s.key} data-testid={`CTL-SIG-${s.key}`} className="flex items-start gap-3 border-t border-pn-divider py-3">
            {body}
          </div>
        );
      })}
    </Card>
  );
}


"use client";

/* Boshqaruv paneli — "Yirik ma'lumotlar" va "ROP tahlili" tablari (2026-10-14).
 * Maketda faqat "Umumiy" chizilgan; bu tablar o'sha uslubda (Card, pastel
 * plitkalar, jadval primitivlari) ma'lumotdan quriladi. */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePT } from "../../i18n";
import { Card, DeltaPill, ExtBadge, ScoreChip } from "../../ui/primitives";
import { TableHead, TableRow } from "../../ui/table";
import { MiniBars } from "../../charts";
import { scoreTone, TONE_VARS, type Tone } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, dayMonthShort, hoursMinutes, type Loc } from "../../lib/dates";
import type { ControlPanel, OperatorDayRow } from "../../data/control";
import { strategic, type ControlNorms } from "./model";

function growth(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || !prev) return null;
  return ((cur - prev) / prev) * 100;
}

function StrategicCard({
  label,
  value,
  unit,
  sub,
  delta,
  lowerIsBetter = false,
  series,
  color,
  testId,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  delta: number | null;
  lowerIsBetter?: boolean;
  series: number[];
  color: string;
  testId: string;
}) {
  const good = delta == null ? null : lowerIsBetter ? delta <= 0 : delta >= 0;
  const tone: Tone = good == null ? "neutral" : good ? "good" : "bad";
  return (
    <Card className="flex min-w-0 flex-col gap-4" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] text-pn-text-2">{label}</div>
          <div className="mt-2 flex items-baseline gap-[6px]">
            <span className="pn-display text-[34px] leading-none tracking-[-0.03em]">{value}</span>
            {unit && <span className="text-[13px] text-pn-subtle">{unit}</span>}
          </div>
          <div className="mt-2 text-[12px] text-pn-muted">{sub}</div>
        </div>
        {delta != null && (
          <DeltaPill tone={tone} arrow={delta >= 0 ? "up" : "down"}>
            {`${Math.abs(delta) < 10 ? fmtDec(Math.abs(delta)) : fmtInt(Math.round(Math.abs(delta)))}%`}
          </DeltaPill>
        )}
      </div>
      <MiniBars
        bars={series.map((v, i) => ({ key: String(i), value: v, color: i === series.length - 1 ? color : "var(--pn-bar-dim)" }))}
        height={46}
        barWidth={22}
        gap={8}
        radius={5}
        minH={3}
        ariaLabel={label}
      />
    </Card>
  );
}

export function StrategicTab({ panel, loc }: { panel: ControlPanel; loc: Loc }) {
  const t = usePT();
  const s = strategic(panel.days);
  const sub = t("ctl.st.sub");
  const som = (v: number) => fmtInt(Math.round(v));
  const trend = useMemo(
    () =>
      [...panel.days]
        .slice(0, 14)
        .reverse()
        .map((d) => ({ date: d.date, calls: d.calls, long: d.long_calls })),
    [panel.days]
  );
  const max = Math.max(1, ...trend.map((d) => d.calls));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @min-[640px]/ctl:grid-cols-2 @min-[1100px]/ctl:grid-cols-3">
        <StrategicCard label={t("ctl.st.calls")} value={fmtInt(s.calls.cur)} sub={sub} delta={growth(s.calls.cur, s.calls.prev)} series={s.calls.series} color="var(--pn-accent)" testId="CTL-ST-calls" />
        <StrategicCard label={t("ctl.st.long")} value={fmtInt(s.long.cur)} sub={sub} delta={growth(s.long.cur, s.long.prev)} series={s.long.series} color="var(--pn-lilac)" testId="CTL-ST-long" />
        <StrategicCard label={t("ctl.st.minutes")} value={hoursMinutes(s.minutes.cur * 60)} sub={sub} delta={growth(s.minutes.cur, s.minutes.prev)} series={s.minutes.series} color="var(--pn-sky)" testId="CTL-ST-minutes" />
        <StrategicCard label={t("ctl.st.quality")} value={s.quality.cur == null ? DASH : fmtDec(s.quality.cur)} unit="/ 10" sub={sub} delta={growth(s.quality.cur, s.quality.prev)} series={s.quality.series} color="var(--pn-good)" testId="CTL-ST-quality" />
        <StrategicCard label={t("ctl.st.bonus")} value={som(s.bonus.cur)} unit={t("ctl.st.som")} sub={sub} delta={growth(s.bonus.cur, s.bonus.prev)} series={s.bonus.series} color="var(--pn-peach)" testId="CTL-ST-bonus" />
        <StrategicCard label={t("ctl.st.penalty")} value={som(s.penalty.cur)} unit={t("ctl.st.som")} sub={sub} delta={growth(s.penalty.cur, s.penalty.prev)} lowerIsBetter series={s.penalty.series} color="var(--pn-bad)" testId="CTL-ST-penalty" />
      </div>
      <Card data-testid="CTL-ST-trend">
        <h2 className="pn-card-title">{t("ctl.st.trend")}</h2>
        <div className="mt-1 text-[13px] text-pn-muted">{t("ctl.st.trendSub")}</div>
        <div className="mt-5 flex h-[200px] gap-2">
          {trend.map((d, i) => (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2" title={`${dayMonth(loc, d.date)} · ${d.calls} / ${d.long}`}>
              <span className="pn-mono text-[10px] text-pn-muted">{d.calls ? fmtInt(d.calls) : ""}</span>
              <div className="relative flex min-h-0 w-full max-w-[36px] flex-1 items-end">
                <div
                  className="pn-bar w-full rounded-t-[6px] rounded-b-[2px]"
                  style={{ height: `${Math.max(2, (d.calls / max) * 100)}%`, background: i === trend.length - 1 ? "var(--pn-accent)" : "var(--pn-bar-dim)" }}
                />
                <div
                  className="pn-bar absolute bottom-0 left-1/2 w-[40%] -translate-x-1/2 rounded-t-[4px]"
                  style={{ height: `${Math.max(0, (d.long / max) * 100)}%`, background: "var(--pn-lilac)" }}
                />
              </div>
              <span className="pn-mono text-[10px] text-pn-subtle">{dayMonthShort(loc, d.date).split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// KPI (norma) va "Holat" ustuni olib tashlandi (2026-10-16).
const ROP_TEMPLATE = "32px minmax(180px,1.8fr) 80px 90px 90px minmax(120px,1fr) 70px";

export function RopTab({
  ops,
  norms,
  longSec,
  date,
  loc,
  targetScore10,
}: {
  ops: OperatorDayRow[] | null;
  norms: ControlNorms;
  longSec: number;
  date: string;
  loc: Loc;
  targetScore10: number | null;
}) {
  const t = usePT();
  const router = useRouter();
  const norm = norms.dailyLongCallsNorm;
  const rows = (ops ?? []).filter((o) => o.calls > 0).sort((a, b) => b.longCalls - a.longCalls || b.calls - a.calls);
  const sub = norm != null ? t("ctl.rop.sub", { day: dayMonth(loc, date), sec: longSec, n: norm }) : t("ctl.rop.subNoNorm", { day: dayMonth(loc, date) });
  return (
    <Card pad="none" className="overflow-hidden" data-testid="CTL-ROP">
      <div className="px-6 pt-[22px] pb-4">
        <h2 className="pn-card-title">{t("ctl.rop.title")}</h2>
        <div className="mt-1 text-[13px] text-pn-muted">{sub}</div>
      </div>
      <div className="overflow-x-auto">
        <div role="table" aria-label={t("ctl.rop.title")} className="min-w-[860px]">
          <TableHead
            template={ROP_TEMPLATE}
            columns={[
              { key: "n", label: "#" },
              { key: "op", label: t("ctl.rop.op") },
              { key: "calls", label: t("ctl.rop.calls"), align: "right" },
              { key: "long", label: t("ctl.rop.long") },
              { key: "talk", label: t("ctl.rop.talk"), align: "right" },
              { key: "dir", label: t("ctl.rop.dir") },
              { key: "score", label: t("ctl.rop.score"), align: "center" },
            ]}
          />
          {rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-[14px] text-pn-muted">{t("ctl.rop.empty")}</div>
          ) : (
            rows.map((o, i) => {
              const ok = norm != null ? o.longCalls >= norm : null;
              const ringTone: Tone = ok == null ? "neutral" : ok ? "good" : "bad";
              const st = scoreTone(o.score10, targetScore10);
              const dirTotal = o.incoming + o.outgoing;
              const href = `/dashboard/recordings?operator=${encodeURIComponent(o.ext ?? o.key)}&date=${date}`;
              return (
                <TableRow key={o.key} template={ROP_TEMPLATE} height={58} onActivate={() => router.push(href)} testId={`CTL-ROP-row-${o.key}`}>
                  <span className="pn-mono text-[13px] text-pn-subtle">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    {o.ext && <ExtBadge>{o.ext}</ExtBadge>}
                    <span className="truncate text-[14px]">{o.name ?? (o.ext ? `Operator ${o.ext}` : t("ctl.rop.unknown"))}</span>
                  </span>
                  <span className="pn-mono text-right text-[14px]">{fmtInt(o.calls)}</span>
                  <span className="pn-mono text-[14px]" style={{ color: TONE_VARS[ringTone].text }}>{o.longCalls}</span>
                  <span className="pn-mono text-right text-[13px] text-pn-text-2">{hoursMinutes(o.talkSec)}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-pn-panel-3">
                      <span className="block h-full rounded-full bg-pn-sky" style={{ width: dirTotal ? `${(o.incoming / dirTotal) * 100}%` : 0 }} />
                    </span>
                    <span className="pn-mono whitespace-nowrap text-[12px] text-pn-muted">{o.incoming} · {o.outgoing}</span>
                  </span>
                  <span className="flex justify-center">
                    <ScoreChip tone={st.tone}>{o.score10 == null ? DASH : fmtDec(o.score10)}</ScoreChip>
                  </span>
                </TableRow>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

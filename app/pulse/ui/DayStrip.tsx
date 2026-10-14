"use client";

/* Kun xulosasi (2026-10-14) — sozlama/CRUD bo'limlari (Xodimlarni
 * boshqarish, Audio yuklash, Mezonlar, amoCRM) sarlavhasidagi "📅 Sana"
 * tanlagan kunning natijasi: qo'ng'iroqlar, baholangan, o'rtacha ball,
 * faol operatorlar. Raqamlar boshqa bo'limlar bilan BIR manbadan
 * (/analytics/daily-summary, /analytics/operators) — farq qilmaydi.
 * Pastdagi havola o'sha kunning audio yozuvlariga olib boradi. */

import { useLocale } from "../../lib/i18n";
import { usePT } from "../i18n";
import { Button, Card, Skeleton } from "./primitives";
import { useMe } from "../data/me";
import { useDaySummary } from "../data/calls";
import { useOperatorDay } from "../data/dayCalls";
import { scoreTone, TONE_VARS } from "../lib/tones";
import { fmtDec, fmtInt, DASH } from "../lib/format";
import { dayMonth, type Loc } from "../lib/dates";

function Tile({ label, value, unit, color, loading, testId }: { label: string; value: string; unit?: string; color?: string; loading: boolean; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-5 py-4" data-testid={testId}>
      <span className="truncate text-[12px] text-pn-muted">{label}</span>
      {loading ? (
        <Skeleton w={64} h={26} />
      ) : (
        <span className="flex items-baseline gap-2">
          <span className="pn-display text-[26px] leading-none tracking-[-0.02em]" style={{ color }}>{value}</span>
          {unit && <span className="pn-mono truncate text-[12px] text-pn-muted">{unit}</span>}
        </span>
      )}
    </div>
  );
}

export function DayStrip({ date, isToday, testId = "DAY" }: { date: string; isToday: boolean; testId?: string }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const { data: me } = useMe();
  const sum = useDaySummary(date);
  const ops = useOperatorDay(me?.company.id, date);
  const row = sum.data?.find((r) => r.date === date);
  const loading = sum.isPending;
  const avg10 = row && row.scored ? row.avg_score / 10 : null;
  const tone = scoreTone(avg10, me?.norms.targetScore10 ?? null).tone;
  const active = ops.data ? ops.data.filter((o) => o.calls > 0).length : null;
  const dayLabel = isToday ? t("date.today") : dayMonth(loc, date);

  return (
    <Card pad="none" className="@container/ds overflow-hidden" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pn-border px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="pn-section-label text-pn-muted">{t("day.title")}</span>
          <span className="text-[13px] font-semibold text-pn-text">{dayLabel}</span>
        </span>
        <Button variant="link" iconRight="chevronRight" href={`/dashboard/recordings${isToday ? "" : `?date=${date}`}`} testId={`${testId}-open`}>
          {t("day.open")}
        </Button>
      </div>
      <div className="grid grid-cols-2 divide-pn-border @min-[640px]/ds:grid-cols-4 @min-[640px]/ds:divide-x">
        <Tile label={t("day.calls")} value={row ? fmtInt(row.calls) : loading ? DASH : "0"} loading={loading} testId={`${testId}-calls`} />
        <Tile
          label={t("day.scored")}
          value={row ? fmtInt(row.scored) : loading ? DASH : "0"}
          unit={row && row.calls && row.scored ? t("calls.tile.share", { p: Math.round((row.scored / row.calls) * 100) }) : undefined}
          loading={loading}
          testId={`${testId}-scored`}
        />
        <Tile
          label={t("day.avg")}
          value={avg10 == null ? DASH : fmtDec(avg10)}
          color={avg10 == null ? undefined : TONE_VARS[tone].text}
          loading={loading}
          testId={`${testId}-avg`}
        />
        <Tile
          label={t("day.ops")}
          value={active == null ? DASH : fmtInt(active)}
          loading={ops.isPending && !ops.isError}
          testId={`${testId}-ops`}
        />
      </div>
    </Card>
  );
}

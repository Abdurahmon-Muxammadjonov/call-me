"use client";

/* BOSHQARUV PANELI — Pulse Noir (02-Boshqaruv.png, Boshqaruv.dc.html), 2026-10-14.
 *
 * URL — holat: ?tab=overview|strategic|rop&date=YYYY-MM-DD
 * Avval eski ManagementView edi: 14 kunlik qo'ng'iroqlarni /api/calls'dan
 * ~90 so'rov bilan tortib brauzerda sanardi. Endi hamma raqam serverda
 * (daily-panel, operators) — bitta kun tanlansa butun panel o'sha kun uchun. */

import { useCallback } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Segmented, Skeleton } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { DateButton } from "../../ui/DateButton";
import { PageHeader, LiveEyebrow } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { pick, useUrlState } from "../../shell/useUrlState";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { serverNow } from "../../shell/clock";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useControlPanel, useOperatorsDay } from "../../data/control";
import { dayMonth, tashkentHourOf, weekdayName, type Loc } from "../../lib/dates";
import { KpiRow, LoadCard, MonthFunnelCard, NegativesCard, PulseCard, SignalsCard } from "./Overview";
import { RopTab, StrategicTab } from "./Tabs";
import type { ControlNorms } from "./model";

const TABS = ["overview", "strategic", "rop"] as const;
type Tab = (typeof TABS)[number];

function ControlSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <Skeleton className="h-[220px] rounded-[26px]" />
      <div className="grid grid-cols-2 gap-4 @min-[1100px]/ctl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-[22px]" />)}
      </div>
      <div className="flex flex-col gap-4 @min-[1100px]/ctl:flex-row">
        <Skeleton className="h-[400px] flex-[1.35] rounded-[26px]" />
        <Skeleton className="h-[400px] flex-1 rounded-[26px]" />
      </div>
    </div>
  );
}

export function ControlPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const tab = pick(url.get("tab"), TABS, "overview") as Tab;
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const panel = useControlPanel(sel.date);
  const ops = useOperatorsDay(sel.date);

  usePageBusy((panel.isFetching && panel.isPlaceholderData) || (ops.isFetching && ops.isPlaceholderData));

  const setTab = useCallback((v: Tab) => url.set({ tab: v === "overview" ? null : v }), [url]);

  const norms: ControlNorms = {
    operatorCount: me?.company.operatorCount ?? null,
    dailyLongCallsNorm: me?.norms.dailyLongCallsNorm ?? null,
    conversionTargetPct: null,
    lowScoreThreshold10: me?.norms.lowScoreThreshold10 ?? null,
  };
  const data = panel.data;
  const opRows = ops.data ?? null;
  const eyebrowText = t("ctl.eyebrow", { day: `${weekdayName(loc, sel.date)}, ${dayMonth(loc, sel.date)}` });
  const now = serverNow();

  return (
    <div className="@container/ctl flex flex-col gap-5">
      <PageHeader
        eyebrow={sel.isToday ? <LiveEyebrow>{eyebrowText}</LiveEyebrow> : <span className="pn-eyebrow">{eyebrowText}</span>}
        title={t("ctl.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="CTL-DATE" />
            <Segmented<Tab>
              size="md"
              value={tab}
              onChange={setTab}
              ariaLabel={t("ctl.tab.aria")}
              testId="CTL-TABS"
              options={[
                { value: "overview", label: t("ctl.tab.overview"), icon: "grid", testId: "CTL-TAB-overview" },
                { value: "strategic", label: t("ctl.tab.strategic"), icon: "trendUp", testId: "CTL-TAB-strategic" },
                { value: "rop", label: t("ctl.tab.rop"), icon: "target", testId: "CTL-TAB-rop" },
              ]}
            />
            <HeaderBell />
          </>
        }
      />

      {!data ? (
        panel.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-8" data-testid="CTL-ERROR">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-pn-bad-tint text-pn-bad">
              <Icon name="warning" size={20} />
            </span>
            <h2 className="pn-card-title">{t("ctl.error")}</h2>
            <p className="text-[14px] text-pn-muted">{t("ctl.errorSub")}</p>
            <Button variant="light" onClick={() => void panel.refetch()} testId="CTL-RETRY">
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <ControlSkeleton />
        )
      ) : (
        <div
          className="flex flex-col gap-5 transition-opacity"
          style={{ opacity: panel.isPlaceholderData ? 0.6 : 1 }}
          aria-busy={panel.isPlaceholderData || undefined}
        >
          {tab === "overview" && (
            <>
              <PulseCard panel={data} ops={opRows} norms={norms} />
              <KpiRow panel={data} ops={opRows} norms={norms} />
              <div className="flex flex-col gap-4 @min-[1100px]/ctl:min-h-[400px] @min-[1100px]/ctl:flex-row">
                <NegativesCard panel={data} />
                <LoadCard panel={data} live={sel.isToday} nowHour={tashkentHourOf(now)} />
              </div>
              <div className="flex flex-col gap-4 @min-[1100px]/ctl:min-h-[330px] @min-[1100px]/ctl:flex-row">
                <MonthFunnelCard panel={data} loc={loc} />
                <SignalsCard panel={data} ops={opRows} norms={norms} loc={loc} />
              </div>
            </>
          )}
          {tab === "strategic" && <StrategicTab panel={data} loc={loc} />}
          {tab === "rop" && (
            <RopTab
              ops={opRows}
              norms={norms}
              longSec={data.long_call_seconds}
              date={sel.date}
              loc={loc}
              targetScore10={me?.norms.targetScore10 ?? null}
            />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/* ANALITIKA (spetsifikatsiya §6.2, 01-Analitika.png, Main.dc.html).
 *
 * URL — holat: ?period=day|week|month&team=all|behind|ok&teamSort=long.desc
 * Parametr almashganda eski ko'rinish 60% xiralashib qoladi (keepPreviousData),
 * sarlavha tepasida 2 px progress, skelet chaqnamaydi (§3.2). */

import { useCallback, useState } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Segmented } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { PageHeader, LiveEyebrow } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { useMinuteTick, serverNow, tashkentHm } from "../../shell/clock";
import { pick, useUrlState } from "../../shell/useUrlState";
import { useAnalytics, type Period } from "../../data/analytics";
import { useMe } from "../../data/me";
import { addDays, dayMonth, monthYear, rangeLabel, tashkentToday, weekStart, weekdayName, type Loc } from "../../lib/dates";
import { HeroTile, PastelTile, ConversionTile } from "./Bento";
import { DynamicsCard } from "./Dynamics";
import { FunnelCard } from "./Funnel";
import { NormBanner } from "./NormBanner";
import { TeamCard, parseSort, type TeamFilter, type TeamSortKey } from "./Team";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { fmtDec } from "../../lib/format";

const PERIODS = ["day", "week", "month"] as const;
const TEAM = ["all", "behind", "ok"] as const;

/* Hisobotlar markazi (§6.8) keyingi bosqichda — tayyor bo'lguncha tugma
 * chiqmaydi (o'lik tugma bo'lmasin, §0.3). */
const REPORTS_READY = false;

function useEyebrow(period: Period, loc: Loc): string {
  useMinuteTick();
  const now = serverNow();
  const today = tashkentToday(now);
  const hm = tashkentHm(now);
  const t = usePT();
  if (period === "day") return `${weekdayName(loc, today)}, ${dayMonth(loc, today)} · ${hm}`;
  if (period === "week") {
    const from = weekStart(today);
    return `${t("an.eyebrow.week", { range: rangeLabel(loc, from, addDays(from, 6), true) })} · ${hm}`;
  }
  return `${monthYear(loc, today)} · ${hm}`;
}

export function AnalyticsPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const period = pick(url.get("period"), PERIODS, "day");
  const team = pick(url.get("team"), TEAM, "all") as TeamFilter;
  const sort = parseSort(url.get("teamSort"));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const { data: me } = useMe();
  const q = useAnalytics(period);
  const eyebrow = useEyebrow(period, loc);

  usePageBusy(q.isFetching && q.isPlaceholderData);

  const setPeriod = useCallback((p: Period) => url.set({ period: p === "day" ? null : p }), [url]);
  const setTeam = useCallback((f: TeamFilter) => url.set({ team: f === "all" ? null : f }), [url]);
  const setSort = useCallback(
    (key: TeamSortKey) => {
      const dir = sort.key === key && sort.dir === "desc" ? "asc" : "desc";
      const v = `${key}.${dir}`;
      url.set({ teamSort: v === "long.desc" ? null : v });
    },
    [sort, url]
  );

  const showBehind = useCallback(() => {
    url.set({ team: "behind" });
    setFocusKey(null);
    requestAnimationFrame(() => document.getElementById("an-team")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [url]);

  const data = q.data;
  const canAdmin = me?.user.role === "director" || me?.user.role === "admin" || me?.user.role === "owner";

  return (
    <div className="@container/an flex flex-col gap-5">
      <PageHeader
        eyebrow={<LiveEyebrow>{eyebrow}</LiveEyebrow>}
        title={t("an.title")}
        actions={
          <>
            <Segmented<Period>
              size="lg"
              value={period}
              onChange={setPeriod}
              ariaLabel={t("an.period.aria")}
              testId="AN-01"
              options={[
                { value: "day", label: t("an.period.day"), testId: "AN-01-day" },
                { value: "week", label: t("an.period.week"), testId: "AN-01-week" },
                { value: "month", label: t("an.period.month"), testId: "AN-01-month" },
              ]}
            />
            <HeaderBell />
            {REPORTS_READY && me?.features.reports && (
              <Button variant="primary" icon="download" href="/dashboard/reports" testId="AN-02">
                {t("an.report")}
              </Button>
            )}
          </>
        }
      />

      {!data ? (
        q.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-8"
            data-testid="AN-ERROR"
          >
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-pn-bad-tint text-pn-bad">
              <Icon name="warning" size={20} />
            </span>
            <h2 className="pn-card-title">{t("an.error")}</h2>
            <p className="text-[14px] text-pn-muted">{t("an.errorSub")}</p>
            <Button variant="light" onClick={() => void q.refetch()} testId="AN-RETRY">
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <AnalyticsSkeleton withHeader={false} />
        )
      ) : (
        <div
          className="flex flex-col gap-5 transition-opacity"
          style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }}
          aria-busy={q.isPlaceholderData || undefined}
        >
          <NormBanner
            data={data}
            onShowAll={showBehind}
            onChip={(ext) => {
              url.set({ team: "behind" });
              setFocusKey(ext);
            }}
          />

          <div className="grid grid-cols-1 gap-4 @min-[560px]/an:grid-cols-2 @min-[1040px]/an:grid-cols-4 @min-[1040px]/an:grid-rows-[172px_172px]">
            <HeroTile data={data} loc={loc} />
            <PastelTile
              tone="lilac"
              title={data.labels.leads.plural}
              value={data.leads?.current ?? null}
              previous={data.leads?.previous ?? null}
              series={data.leads?.series ?? null}
              sub={
                data.leads
                  ? `${t(`an.prev.${period}` as "an.prev.day")} ${data.leads.previous ?? "—"} · ${t("an.pastel.unique")}`
                  : null
              }
              canConnect={!!canAdmin}
              noCrm={data.features.amocrm === false}
              loc={loc}
              period={period}
              testId="AN-LEADS"
            />
            <PastelTile
              tone="sky"
              title={data.labels.offers.plural}
              value={data.offers?.current ?? null}
              previous={data.offers?.previous ?? null}
              series={data.offers?.series ?? null}
              sub={
                data.offers?.shareOfLeadsPct != null
                  ? t("an.pastel.share", { pct: fmtDec(data.offers.shareOfLeadsPct) })
                  : null
              }
              canConnect={!!canAdmin}
              noCrm={data.features.amocrm === false}
              loc={loc}
              period={period}
              testId="AN-OFFERS"
            />
            <ConversionTile data={data} t={t} />
          </div>

          <div className="flex flex-col gap-4 @min-[1040px]/an:min-h-[372px] @min-[1040px]/an:flex-row">
            <DynamicsCard data={data} loc={loc} />
            <FunnelCard data={data} />
          </div>

          <TeamCard
            data={data}
            loading={q.teamLoading}
            error={q.teamError}
            onRetry={() => void q.refetchTeam()}
            filter={team}
            onFilter={setTeam}
            sort={sort}
            onSort={setSort}
            focusKey={focusKey}
            onShowDay={() => setPeriod("day")}
          />
        </div>
      )}
    </div>
  );
}

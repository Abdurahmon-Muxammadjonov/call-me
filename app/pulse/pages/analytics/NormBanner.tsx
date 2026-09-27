"use client";

/* Norma banneri (§6.2): faqat `lagging.count > 0` bo'lsa. Joy
 * torayganda chiplar 3 → 2 → 1 → 0 (container query), matn ko'pi bilan
 * 2 qator. Chip (AN-04-{ext}) — jadvalda shu operatorni ko'rsatadi,
 * "Barchasini ko'rish" (AN-03) — jadvalni "Orqada" filtri bilan ochadi. */

import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/primitives";
import { usePT } from "../../i18n";
import type { AnalyticsData } from "../../data/analytics";

export function NormBanner({
  data,
  onShowAll,
  onChip,
}: {
  data: AnalyticsData;
  onShowAll: () => void;
  onChip: (ext: string) => void;
}) {
  const t = usePT();
  const lag = data.lagging;
  const sec = data.norms.longCallSec;
  const norm = data.norms.dailyLongCallsNorm;
  if (!lag || lag.count <= 0 || sec == null || norm == null) return null;
  const p = data.period;
  const chipHide = ["@max-[620px]/banner:hidden", "@max-[760px]/banner:hidden", "@max-[900px]/banner:hidden"];
  return (
    <div className="@container/banner" data-testid="AN-BANNER">
      <div className="flex items-center gap-[14px] rounded-[18px] border border-pn-alert-border bg-pn-alert-bg py-[7px] pl-4 pr-[7px]">
        <Icon name="warning" size={20} stroke={2} className="text-pn-bad" />
        <p className="line-clamp-2 min-w-0 flex-1 text-[14px] text-pn-text-2">
          <span className="font-semibold text-pn-text">{t("an.banner.count", { n: lag.count })}</span>{" "}
          {t(`an.banner.${p}` as "an.banner.day")} · {t("an.banner.norm", { sec, n: norm })}
          {p !== "day" && ` ${t("an.banner.perDay")}`}
        </p>
        <div className="flex shrink-0 gap-[6px]">
          {lag.top.slice(0, 3).map((l, i) => (
            <button
              key={l.ext}
              type="button"
              data-testid={`AN-04-${l.ext}`}
              aria-label={t("an.banner.chip", { ext: l.ext, long: l.longCalls, norm: l.normTarget })}
              onClick={() => onChip(l.ext)}
              className={`pn-press pn-mono inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-pn-track bg-pn-panel-2 px-3 text-[12px] font-medium text-pn-text-2 hover:border-pn-border-3 ${chipHide[i]}`}
            >
              {l.ext}
              <span className="text-pn-bad-soft">
                {l.longCalls}/{l.normTarget}
              </span>
            </button>
          ))}
        </div>
        <Button variant="light" onClick={onShowAll} testId="AN-03" className="shrink-0">
          {t("an.banner.all")}
        </Button>
      </div>
    </div>
  );
}

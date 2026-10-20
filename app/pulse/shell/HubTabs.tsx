"use client";

/* Birlashtirilgan bo'lim tablari (2026-10-16): Dashboard (Analitika |
 * Boshqaruv | Solishtirish) va Qo'ng'iroqlar tahlili (Audio yozuvlar |
 * Tahlil holati | Chuqur tahlil | Baholash mezonlari | Kategoriyalar).
 * Har tab — mavjud sahifa (URL o'zgarmagan); tanlangan ?date= tablar
 * orasida saqlanadi — bir kunni turli ko'rinishda solishtirish oson.
 * Tarifda yopiq tab qulf bilan, bosilsa kod oynasi (Nav bilan bir xil). */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePT } from "../i18n";
import { Icon } from "../ui/Icon";
import { routeById, type Hub, type NavRoute, type RouteId } from "./routes";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export function HubTabs({
  hub,
  active,
  isLocked,
  onLockedClick,
}: {
  hub: Hub;
  active: RouteId | null;
  isLocked: (r: NavRoute) => boolean;
  onLockedClick: (r: NavRoute) => void;
}) {
  const t = usePT();
  const sp = useSearchParams();
  const date = sp.get("date");
  return (
    <nav aria-label={t("hub.tabs")} className="pointer-events-auto flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-pn-border-2/70 bg-pn-panel/60 p-1 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl backdrop-saturate-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid={`HUB-${hub.id}`}>
      {hub.tabs.map((id) => {
        const r = routeById(id);
        if (!r) return null;
        const on = id === active;
        const locked = isLocked(r);
        const cls = cx(
          "pn-press inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-medium",
          on ? "bg-pn-seg-active-bg text-pn-seg-active-text" : "text-pn-text-2 hover:text-pn-text"
        );
        const body = (
          <>
            <Icon name={r.icon} size={14} />
            {t(r.label)}
            {locked && <Icon name="lock" size={12} className="text-pn-faint" />}
          </>
        );
        if (locked) {
          return (
            <button key={id} type="button" className={cls} onClick={() => onLockedClick(r)} data-testid={`HUB-TAB-${id}`}>
              {body}
            </button>
          );
        }
        return (
          <Link key={id} href={date ? `${r.href}?date=${date}` : r.href} prefetch aria-current={on ? "page" : undefined} className={cls} data-testid={`HUB-TAB-${id}`}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}

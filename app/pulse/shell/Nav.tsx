"use client";

/* Yon menyu (spetsifikatsiya §6.0, 00-Nav.png, Nav.dc.html).
 * Boshqaruvlar: NAV-01 logotip, NAV-02 kompaniya tugmasi, NAV-03 menyu
 * bandlari (15 ta), NAV-04 til, NAV-05 mavzu. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { CountBadge } from "../ui/primitives";
import { Tooltip } from "../ui/overlays";
import { usePT } from "../i18n";
import { MAIN_ROUTES, SETTINGS_ROUTES, activeRouteId, type NavRoute, type RouteId } from "./routes";
import { useIntentPrefetch } from "./prefetch";
import { CompanyPopover } from "./CompanyPopover";
import { LanguageButton } from "./LanguageButton";
import { ThemeButton } from "./ThemeButton";
import { Skeleton } from "../ui/primitives";
import type { Me, Badges } from "../data/me";
import { fmtThreshold } from "../lib/format";

export interface NavGate {
  isLocked: (route: NavRoute) => boolean;
  onLockedClick: (route: NavRoute) => void;
  canAdmin: boolean;
}

export function Nav({
  me,
  badges,
  gate,
  onNavigate,
  onLogout,
}: {
  me: Me | undefined;
  badges: Badges | undefined;
  gate: NavGate;
  /* Mobil tortma: bandga bosilganda yopiladi. */
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const t = usePT();
  const pathname = usePathname() ?? "";
  const active = activeRouteId(pathname);

  return (
    <aside className="flex h-full flex-col gap-[14px] rounded-[22px] border border-pn-border bg-pn-panel px-3 pb-3 pt-[18px]">
      {/* NAV-01 — logotip, Analitikaga havola */}
      <Link
        href="/dashboard"
        prefetch
        onClick={onNavigate}
        data-testid="NAV-01"
        aria-label={`${t("brand.name")} — ${t("nav.analytics")}`}
        className="flex items-center gap-3 rounded-xl px-[6px]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pn-accent text-pn-accent-ink">
          <Icon name="pulse" size={22} stroke={2.2} />
        </span>
        <span className="min-w-0">
          <span className="pn-display block text-[20px] leading-none tracking-[-0.02em] text-pn-text">{t("brand.name")}</span>
          <span className="mt-[5px] block text-[10px] uppercase leading-none tracking-[0.18em] text-pn-muted">{t("brand.tagline")}</span>
        </span>
      </Link>

      <CompanyButton me={me} canAdmin={gate.canAdmin} onLogout={onLogout} onNavigate={onNavigate} />

      <div className="pn-scroll-hidden -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <nav aria-label={t("nav.aria")} className="flex flex-col gap-[2px]">
          <div className="pn-nav-label px-[10px] pb-[6px] pt-1">{t("nav.section.main")}</div>
          {MAIN_ROUTES.map((r) => (
            <NavItem
              key={r.id}
              route={r}
              active={active === r.id}
              locked={gate.isLocked(r)}
              onLockedClick={gate.onLockedClick}
              onNavigate={onNavigate}
              badge={r.id === "audio" ? <AudioBadge me={me} badges={badges} onAccent={active === r.id} /> : null}
            />
          ))}
          <div className="pn-nav-label px-[10px] pb-[6px] pt-[14px]">{t("nav.section.settings")}</div>
          {SETTINGS_ROUTES.filter((r) => !r.adminOnly || gate.canAdmin).map((r) => (
            <NavItem
              key={r.id}
              route={r}
              active={active === r.id}
              locked={gate.isLocked(r)}
              onLockedClick={gate.onLockedClick}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="flex gap-2">
        <LanguageButton />
        <ThemeButton />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------ NAV-03 */

function NavItem({
  route,
  active,
  locked,
  onLockedClick,
  onNavigate,
  badge,
}: {
  route: NavRoute;
  active: boolean;
  locked: boolean;
  onLockedClick: (r: NavRoute) => void;
  onNavigate?: () => void;
  badge?: ReactNode;
}) {
  const t = usePT();
  const intent = useIntentPrefetch(route.id);
  const cls = `pn-press group flex h-11 items-center gap-3 rounded-xl pl-3 pr-[10px] text-[14px] ${
    active ? "bg-pn-accent font-semibold text-pn-accent-ink" : "text-pn-text-3 hover:bg-pn-panel-2 hover:text-pn-text"
  }`;
  const body = (
    <>
      <Icon name={route.icon} size={18} className={active ? "text-pn-accent-ink" : "text-pn-subtle"} />
      <span className="min-w-0 flex-1 truncate">{t(route.label)}</span>
      {locked ? <Icon name="lock" size={14} className="text-pn-faint" /> : badge}
    </>
  );
  const testId = `NAV-03-${route.id}`;
  if (locked) {
    // Tarifda yopiq: sahifaga o'tmaydi, kod kiritish oynasini ochadi.
    return (
      <button
        type="button"
        data-testid={testId}
        aria-label={t("nav.locked", { section: t(route.label) })}
        onClick={() => onLockedClick(route)}
        className={`${cls} w-full text-left`}
      >
        {body}
      </button>
    );
  }
  return (
    <Link
      href={route.href}
      prefetch
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      onPointerEnter={intent.onEnter}
      onPointerLeave={intent.onLeave}
      onFocus={intent.onEnter}
      onBlur={intent.onLeave}
      className={cls}
    >
      {body}
    </Link>
  );
}

function AudioBadge({ me, badges, onAccent }: { me: Me | undefined; badges: Badges | undefined; onAccent: boolean }) {
  const t = usePT();
  const n = badges?.audioLowToday;
  if (!n) return null; // 0 yoki noma'lum — nishon yo'q (§6.0)
  const threshold = me?.norms.lowScoreThreshold10;
  const hint = threshold == null ? null : t("nav.badge.audioLow", { threshold: fmtThreshold(threshold) });
  const badge = (
    <span data-testid="NAV-03-audio-badge" className="inline-flex">
      <CountBadge value={n} onAccent={onAccent} />
      {/* Ekran o'quvchi uchun: tooltip matni havola nomiga qo'shiladi. */}
      {hint && <span className="sr-only">{`, ${n} — ${hint}`}</span>}
    </span>
  );
  if (!hint) return badge;
  return (
    <Tooltip content={hint} placement="right-start">
      {badge}
    </Tooltip>
  );
}

/* ------------------------------------------------------------ NAV-02 */

function CompanyButton({
  me,
  canAdmin,
  onLogout,
  onNavigate,
}: {
  me: Me | undefined;
  canAdmin: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const t = usePT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const c = me?.company;
  const sub =
    c == null
      ? null
      : c.planName && c.operatorCount != null
        ? t("company.sub", { plan: c.planName, n: c.operatorCount })
        : c.operatorCount != null
          ? t("company.subOperators", { n: c.operatorCount })
          : c.planName;
  return (
    <>
      <button
        ref={ref}
        type="button"
        data-testid="NAV-02"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("company.menu")}
        onClick={() => setOpen((v) => !v)}
        className="pn-press flex h-[52px] w-full items-center gap-[10px] rounded-[14px] border border-pn-border-2 bg-pn-panel-2 px-[10px] text-left hover:border-pn-border-3"
      >
        {c ? (
          c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- kompaniya logotipi ixtiyoriy tashqi URL
            <img src={c.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
          ) : (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-pn-bar-dim text-[12px] font-bold text-pn-text">
              {c.initials}
            </span>
          )
        ) : (
          <Skeleton w={32} h={32} r={10} />
        )}
        <span className="min-w-0 flex-1">
          {c ? (
            <>
              <span className="block truncate text-[13px] font-semibold text-pn-text">{c.name}</span>
              {sub && <span className="mt-[2px] block truncate text-[11px] font-medium text-pn-muted">{sub}</span>}
            </>
          ) : (
            <>
              <Skeleton w="80%" h={12} r={6} />
              <Skeleton w="55%" h={10} r={5} className="mt-[6px]" />
            </>
          )}
        </span>
        <Icon name="chevronsUpDown" size={16} stroke={2} className="text-pn-muted" />
      </button>
      <CompanyPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        me={me}
        canAdmin={canAdmin}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
    </>
  );
}

export type { RouteId };

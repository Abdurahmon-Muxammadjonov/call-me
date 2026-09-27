"use client";

/* Doimiy qobiq (§3.1): yon menyu + sahifa konteyneri. Navigatsiyada
 * HECH QACHON qayta o'rnatilmaydi — menyu holati, jonli ulanish, toastlar
 * va qalqib chiquvchi oynalar sahifalardan yuqorida yashaydi.
 *
 * Sessiya tekshiruvi eski /dashboard sahifasidagidek: gidratatsiyadan
 * keyin sessiya yo'q bo'lsa → /login, direktor bo'lmasa → /cabinet.
 * Tekshiruv tugaguncha sahifa o'rnida skelet turadi (eski bo'limlar
 * sessiyasiz so'rov yubormasin). */

import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, useHydrated, useSession } from "../../lib/auth";
import { useHasRole } from "../../lib/useHasRole";
import { useSections } from "../../lib/sections";
import { LockedSectionModal } from "../../components/LockedSectionModal";
import { Nav, type NavGate } from "./Nav";
import { NotificationsController } from "./Notifications";
import { PageSkeleton } from "./PageSkeleton";
import { usePageStore } from "./pageStore";
import { useShellRealtime } from "./realtime";
import { useLiveStore } from "./liveStore";
import { useIdlePrefetch } from "./prefetch";
import { setServerTime } from "./clock";
import { activeRouteId, type NavRoute } from "./routes";
import { InPulseShellContext } from "./context";
import { Icon } from "../ui/Icon";
import { Button, IconButton } from "../ui/primitives";
import { Drawer, Modal, OVERLAY_ROOT_ID } from "../ui/overlays";
import { ToastHost } from "../ui/toast";
import { usePT } from "../i18n";
import { useBadges, useMe } from "../data/me";
import { apiFetch } from "../data/api";
import { clearPersistedCaches, rememberCompanyId } from "../data/QueryProvider";
import { applyAccent, useResolvedTheme } from "../lib/prefs";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function PulseShell({ fontClass, children }: { fontClass: string; children: ReactNode }) {
  const t = usePT();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const qc = useQueryClient();
  const hydrated = useHydrated();
  const session = useSession();
  const allowed = hydrated && !!session && session.role === "director";
  const canAdmin = useHasRole(["director", "admin"]);
  // "Tizim" afzalligida OS mavzusi o'zgarsa jonli kuzatilsin (mobil
  // ekranda menyu yopiq bo'lsa ham) — store'ga obuna shu yerda.
  useResolvedTheme();

  useEffect(() => {
    if (!hydrated) return;
    if (session === null) router.replace("/login");
    else if (session.role !== "director") router.replace("/cabinet");
  }, [hydrated, session, router]);

  const { data: me } = useMe();
  const { data: badges } = useBadges(allowed ? me?.company.id : undefined);

  // /me dan: server vaqti farqi, kompaniya aksenti, kesh nomlari uchun id.
  useEffect(() => {
    if (!me) return;
    setServerTime(me.serverTime);
    applyAccent(me.company.accent);
    rememberCompanyId(me.company.id);
  }, [me]);

  // Qo'ng'iroqchadagi oqim faqat shu kompaniya operatorlariniki bo'lsin.
  const managers = useQuery({
    queryKey: ["v1", "managers"],
    queryFn: ({ signal }) => apiFetch<Array<{ id: string }>>("/managers", { signal }),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });
  const managerIds = useMemo(
    () => (Array.isArray(managers.data) ? new Set(managers.data.map((m) => m.id)) : null),
    [managers.data]
  );
  useShellRealtime(allowed, managerIds);
  useIdlePrefetch(allowed && !!me);

  // Tarif bo'yicha yopiq bandlar — eski qoidalar (SectionsProvider).
  // Yuklanayotganda qulf ko'rsatilmaydi (har yuklanishda "miltillamasin").
  const sections = useSections();
  const [lockedRoute, setLockedRoute] = useState<NavRoute | null>(null);
  const gate: NavGate = useMemo(
    () => ({
      isLocked: (r) => !sections.loading && !!r.sectionKey && !sections.isUnlocked(r.sectionKey),
      onLockedClick: (r) => setLockedRoute(r),
      canAdmin,
    }),
    [sections, canAdmin]
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  function logout() {
    setConfirmOut(false);
    qc.clear();
    void clearPersistedCaches();
    useLiveStore.getState().reset();
    clearSession();
    router.replace("/login");
  }

  const busy = usePageStore((s) => s.busy);
  const online = useOnline();
  const routeId = activeRouteId(pathname);

  return (
    <div className={`${fontClass} pn-root min-h-dvh`}>
      <a
        href="#pn-main"
        className="sr-only z-[90] rounded-full bg-pn-accent px-4 py-2 text-[13px] font-semibold text-pn-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("common.skipToContent")}
      </a>
      <div className="flex min-h-dvh">
        {/* Yon menyu ustuni: 260 px, sticky, 100dvh (≥1024 px). */}
        <div className="sticky top-0 hidden h-dvh w-[260px] shrink-0 py-3 pl-3 lg:block" data-testid="NAV">
          <Nav me={me} badges={badges} gate={gate} onLogout={() => setConfirmOut(true)} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobil yuqori panel (A15) */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-pn-border bg-pn-bg px-4 lg:hidden">
            <IconButton
              icon="menu"
              label={t("nav.openMenu")}
              size={42}
              tone="panel-2"
              testId="NAV-00-menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            />
            <Link href="/dashboard" className="flex items-center gap-[10px]" aria-label={t("brand.name")}>
              <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-pn-accent text-pn-accent-ink">
                <Icon name="pulse" size={20} stroke={2.2} />
              </span>
              <span className="pn-display text-[18px] tracking-[-0.02em]">{t("brand.name")}</span>
            </Link>
          </header>

          <main
            id="pn-main"
            tabIndex={-1}
            className="relative flex min-w-0 flex-1 flex-col gap-5 px-4 pb-8 pt-4 outline-none lg:pb-8 lg:pl-5 lg:pr-8 lg:pt-6"
            data-route={routeId ?? ""}
          >
            {busy && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden" data-testid="HDR-PROGRESS">
                <div className="pn-progress-bar h-full w-1/2 bg-pn-accent" />
              </div>
            )}
            {!online && (
              <div
                role="status"
                data-testid="BANNER-OFFLINE"
                className="flex items-center gap-[14px] rounded-[18px] border border-pn-alert-border bg-pn-alert-bg py-[10px] pl-4 pr-4 text-[14px] text-pn-text-2"
              >
                <Icon name="warning" size={20} className="text-pn-bad" />
                {t("offline.banner")}
              </div>
            )}
            {allowed ? <InPulseShellContext.Provider value={true}>{children}</InPulseShellContext.Provider> : <PageSkeleton />}
          </main>
        </div>
      </div>

      {/* Mobil menyu tortmasi */}
      <Drawer open={mobileOpen} onClose={closeMobile} side="left" width={300} label={t("nav.aria")} testId="NAV-DRAWER">
        <div className="h-full p-3">
          <Nav me={me} badges={badges} gate={gate} onNavigate={closeMobile} onLogout={() => setConfirmOut(true)} />
        </div>
      </Drawer>

      <Suspense fallback={null}>{allowed && <NotificationsController />}</Suspense>

      <Modal open={confirmOut} onClose={() => setConfirmOut(false)} label={t("company.logout.title")} testId="NAV-02-logout-modal">
        <h2 className="pn-card-title">{t("company.logout.title")}</h2>
        <p className="mt-2 text-[14px] text-pn-muted">{t("company.logout.body")}</p>
        <div className="mt-6 flex justify-end gap-[10px]">
          <Button variant="outline" onClick={() => setConfirmOut(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={logout} testId="NAV-02-logout-confirm" className="bg-pn-bad! text-white!">
            {t("company.logout.confirm")}
          </Button>
        </div>
      </Modal>

      {lockedRoute?.sectionKey && (
        <LockedSectionModal
          open
          sectionKey={lockedRoute.sectionKey}
          sectionLabel={t(lockedRoute.label)}
          inPlan={sections.inPlan(lockedRoute.sectionKey)}
          onClose={() => setLockedRoute(null)}
        />
      )}

      <ToastHost />
      <div id={OVERLAY_ROOT_ID} />
    </div>
  );
}

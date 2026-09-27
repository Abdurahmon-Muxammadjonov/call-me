"use client";

/* HDR-BELL (§6.1) va Bildirishnomalar tortmasi (A2, §6.9).
 *
 * Qo'ng'iroqcha `?notifications=all` ni push qiladi — tortma URL bilan
 * sinxron, "Orqaga" uni yopadi. v2 bildirishnomalar API'si (Appendix A)
 * hali yo'q: ro'yxat qobiqning jonli oqimidagi yangi qo'ng'iroqlar (eski
 * CallNotificationBell bilan bir xil manba va bir xil harakat — bosilsa
 * Chuqur tahlilda ochiladi). */

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../ui/Icon";
import { Drawer, OverlayHeader } from "../ui/overlays";
import { usePT } from "../i18n";
import { useLiveStore } from "./liveStore";
import { useBadges, useMe } from "../data/me";
import { apiFetch, API_V2 } from "../data/api";
import { tashkentHm } from "./clock";

/* Tortmani qo'ng'iroqcha ochdimi (push) — shunda yopish = router.back().
 * To'g'ridan-to'g'ri URL bilan kelganda tarixni buzmaslik uchun replace. */
const history = { openedByPush: false };
function setOpenedByPush(v: boolean): void {
  history.openedByPush = v;
}

function useUnread(): number {
  const { data: me } = useMe();
  const { data: badges } = useBadges(me?.company.id);
  const liveUnread = useLiveStore((s) => s.unread);
  return API_V2 ? (badges?.notificationsUnread ?? 0) : liveUnread;
}

export function HeaderBell() {
  const t = usePT();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const unread = useUnread();
  return (
    <button
      type="button"
      data-testid="HDR-BELL"
      aria-label={t("bell.aria", { n: unread })}
      onClick={() => {
        const p = new URLSearchParams(window.location.search);
        p.set("notifications", "all");
        setOpenedByPush(true);
        router.push(`${pathname}?${p.toString()}`, { scroll: false });
      }}
      className="pn-press relative grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border border-pn-border bg-pn-panel text-pn-text hover:bg-pn-panel-2"
    >
      <Icon name="bell" size={18} />
      {unread > 0 && (
        <span
          aria-hidden
          data-testid="HDR-BELL-dot"
          className="absolute right-3 top-[11px] h-2 w-2 rounded-full border-2 border-pn-panel bg-pn-bad"
        />
      )}
    </button>
  );
}

interface ManagerRow {
  id: string;
  name: string;
}

export function NotificationsController() {
  const t = usePT();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const mode = sp.get("notifications");
  const open = mode === "all" || mode === "signals";
  const calls = useLiveStore((s) => s.calls);
  const markAllRead = useLiveStore((s) => s.markAllRead);
  const removeCall = useLiveStore((s) => s.removeCall);

  const managers = useQuery({
    queryKey: ["v1", "managers"],
    queryFn: ({ signal }) => apiFetch<ManagerRow[]>("/managers", { signal }),
    enabled: open && calls.length > 0,
    staleTime: 5 * 60_000,
  });
  const names = useMemo(
    () => new Map((Array.isArray(managers.data) ? managers.data : []).map((m) => [m.id, m.name])),
    [managers.data]
  );

  // Tortma ochiq turganda kelganlari ham o'qilgan hisoblanadi.
  useEffect(() => {
    if (open) markAllRead();
  }, [open, calls.length, markAllRead]);

  function close() {
    if (history.openedByPush) {
      setOpenedByPush(false);
      router.back();
      return;
    }
    const p = new URLSearchParams(sp.toString());
    p.delete("notifications");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openCall(id: string) {
    setOpenedByPush(false);
    removeCall(id);
    router.push(`/dashboard/deep-audit?call=${encodeURIComponent(id)}`);
  }

  return (
    <Drawer open={open} onClose={close} width={420} label={t("notif.title")} testId="NOTIF-DRAWER">
      <div className="px-6 pb-4 pt-[22px]">
        <OverlayHeader title={t("notif.title")} onClose={close} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-pn-panel-2 text-pn-muted">
              <Icon name="bell" size={20} />
            </span>
            <p className="mt-4 text-[14px] font-semibold text-pn-text">{t("notif.empty")}</p>
            <p className="mt-1 text-[13px] text-pn-muted">{t("notif.emptySub")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-[2px]">
            {calls.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openCall(c.id)}
                  data-testid={`NOTIF-item-${c.id}`}
                  className="pn-press flex w-full items-center gap-3 rounded-[14px] px-3 py-[10px] text-left hover:bg-pn-panel-2"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pn-accent-soft text-pn-accent-strong">
                    <Icon name="wave" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-pn-text">
                      {(c.managerId && names.get(c.managerId)) || t("notif.newCall")}
                    </span>
                    <span className="pn-mono mt-[2px] block text-[12px] text-pn-muted">{tashkentHm(new Date(c.createdAt))}</span>
                  </span>
                  <Icon name="chevronRight" size={16} className="text-pn-subtle" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}

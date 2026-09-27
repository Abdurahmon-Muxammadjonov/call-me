"use client";

/* NAV-02 popover (A6): foydalanuvchi, kompaniyalar ro'yxati (faqat >1
 * bo'lsa; >6 bo'lsa qidiruv), Brend/KPI havolalari (owner/admin),
 * "Mavzu" (Qorong'i / Yorug' / Tizim — "Tizim"ni tanlash joyi faqat shu),
 * "Hisobdan chiqish". */

import Link from "next/link";
import { useMemo, useState, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/overlays";
import { Segmented } from "../ui/primitives";
import { usePT } from "../i18n";
import { setThemePref, useThemePref, type ThemePref } from "../lib/prefs";
import { savePreferences, switchCompany } from "../data/preferences";
import { clearPersistedCaches } from "../data/QueryProvider";
import { toast } from "../ui/toast";
import type { Me } from "../data/me";

export function CompanyPopover({
  open,
  onClose,
  anchorRef,
  me,
  canAdmin,
  onLogout,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  me: Me | undefined;
  canAdmin: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const t = usePT();
  const qc = useQueryClient();
  const pref = useThemePref();
  const [q, setQ] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const companies = useMemo(() => me?.companies ?? [], [me]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? companies.filter((c) => c.name.toLowerCase().includes(needle)) : companies;
  }, [companies, q]);

  async function pick(id: string) {
    if (!me || id === me.company.id || switching) return;
    setSwitching(id);
    try {
      await switchCompany(id);
      // Boshqa kompaniya — eski kesh (xotira + IndexedDB) yaroqsiz.
      qc.clear();
      await clearPersistedCaches();
      await qc.refetchQueries({ queryKey: ["v2", "me"] });
      onClose();
    } catch {
      toast(t("company.switchFailed"), "bad");
    } finally {
      setSwitching(null);
    }
  }

  function setTheme(p: ThemePref) {
    setThemePref(p);
    void savePreferences({ theme: p });
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      placement="bottom-start"
      width={280}
      label={t("company.menu")}
      testId="NAV-02-popover"
      className="p-2"
    >
      {me && (
        <div className="px-3 pb-3 pt-2">
          <div className="truncate text-[14px] font-semibold text-pn-text">{me.user.name}</div>
          <div className="mt-[2px] truncate text-[12px] text-pn-muted">{me.user.roleLabel}</div>
        </div>
      )}

      {companies.length > 1 && (
        <div className="border-t border-pn-border py-2">
          {companies.length > 6 && (
            <label className="mx-1 mb-2 flex h-10 items-center gap-2 rounded-xl border border-pn-border-2 bg-pn-field px-3">
              <Icon name="search" size={15} className="text-pn-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("company.search")}
                aria-label={t("company.search")}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-pn-text outline-none placeholder:text-pn-subtle"
              />
            </label>
          )}
          <ul role="listbox" aria-label={t("company.menu")} className="flex max-h-[264px] flex-col gap-[2px] overflow-y-auto">
            {shown.map((c) => {
              const cur = c.id === me?.company.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={cur}
                    disabled={!!switching}
                    onClick={() => void pick(c.id)}
                    data-testid={`NAV-02-company-${c.id}`}
                    className="pn-press flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-pn-panel-2 disabled:opacity-60"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pn-bar-dim text-[11px] font-bold text-pn-text">
                      {c.initials}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-pn-text">{c.name}</span>
                    {switching === c.id ? (
                      <span className="text-[12px] text-pn-muted">{t("company.switching")}</span>
                    ) : (
                      cur && <Icon name="check" size={16} stroke={2.2} className="text-pn-accent-strong" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canAdmin && (
        <div className="flex flex-col gap-[2px] border-t border-pn-border py-2">
          <MenuLink href="/settings/branding" icon="brand" label={t("nav.brand")} testId="NAV-02-brand" onClick={() => { onClose(); onNavigate?.(); }} />
          <MenuLink href="/settings/norms" icon="target" label={t("nav.norms")} testId="NAV-02-norms" onClick={() => { onClose(); onNavigate?.(); }} />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-pn-border px-3 py-3">
        <span className="text-[12px] font-medium text-pn-muted">{t("company.theme")}</span>
        <Segmented<ThemePref>
          size="sm"
          inCard
          stretch
          value={pref}
          onChange={setTheme}
          ariaLabel={t("company.theme")}
          testId="NAV-02-theme"
          options={[
            { value: "dark", label: t("company.theme.dark"), testId: "NAV-02-theme-dark" },
            { value: "light", label: t("company.theme.light"), testId: "NAV-02-theme-light" },
            { value: "system", label: t("company.theme.system"), testId: "NAV-02-theme-system" },
          ]}
        />
      </div>

      <div className="border-t border-pn-border pt-2">
        <button
          type="button"
          data-testid="NAV-02-logout"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="pn-press flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium text-pn-bad hover:bg-pn-panel-2"
        >
          <Icon name="logout" size={17} />
          {t("company.logout")}
        </button>
      </div>
    </Popover>
  );
}

function MenuLink({
  href,
  icon,
  label,
  testId,
  onClick,
}: {
  href: string;
  icon: "brand" | "target";
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      data-testid={testId}
      onClick={onClick}
      className="pn-press flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] text-pn-text-3 hover:bg-pn-panel-2 hover:text-pn-text"
    >
      <Icon name={icon} size={18} className="text-pn-subtle" />
      {label}
    </Link>
  );
}

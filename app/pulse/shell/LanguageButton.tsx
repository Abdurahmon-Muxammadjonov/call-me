"use client";

/* NAV-04 — til tugmasi va popover (A7): joriy tilda belgi. Tanlanganda
 * cookie + <html lang> yangilanadi, matnlar sahifani qayta yuklamasdan
 * almashadi; so'rov kalitlarida til bor — faol so'rovlar yangi tilda
 * qayta olinadi (server Msg.text lokalizatsiyasi). */

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/overlays";
import { usePT, type PKey } from "../i18n";
import { LOCALES, setLocale, useLocale, type Locale } from "../../lib/i18n";
import { savePreferences } from "../data/preferences";

const LABEL: Record<Locale, PKey> = { uz: "lang.uz", ru: "lang.ru", en: "lang.en" };

export function LanguageButton() {
  const t = usePT();
  const locale = useLocale();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  function choose(l: Locale) {
    setOpen(false);
    if (l === locale) return;
    setLocale(l);
    void savePreferences({ locale: l });
    // Til kalitda bor; kalitsiz (v1 adapter) so'rovlar ham yangilansin.
    void qc.invalidateQueries({ type: "active" });
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        data-testid="NAV-04"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("lang.button", { lang: t(LABEL[locale]) })}
        onClick={() => setOpen((v) => !v)}
        className="pn-press flex h-11 min-w-0 flex-1 items-center gap-[10px] rounded-xl border border-pn-border-2 bg-pn-panel-2 px-3 text-[13px] font-medium text-pn-text hover:border-pn-border-3"
      >
        <Icon name="globe" size={16} className="text-pn-muted" />
        <span className="min-w-0 flex-1 truncate text-left">{t(LABEL[locale])}</span>
        <Icon name="chevronDown" size={14} stroke={2} className="text-pn-muted" />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        placement="top-start"
        label={t("lang.button", { lang: t(LABEL[locale]) })}
        role="menu"
        minWidth={220}
        testId="NAV-04-popover"
      >
        <div className="flex flex-col gap-[2px]">
          {LOCALES.map((l) => {
            const on = l.value === locale;
            return (
              <button
                key={l.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                data-testid={`NAV-04-${l.value}`}
                onClick={() => choose(l.value)}
                className="pn-press flex h-11 items-center gap-3 rounded-xl px-3 text-left text-[14px] text-pn-text hover:bg-pn-panel-2"
              >
                <span className="min-w-0 flex-1">{t(LABEL[l.value])}</span>
                {on && <Icon name="check" size={16} stroke={2.2} className="text-pn-accent-strong" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

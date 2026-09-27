"use client";

/* NAV-05 — mavzu tugmasi: qorong'i ↔ yorug'. Ikonka CSS orqali tanlanadi
 * (gidratatsiyada sakramaydi): qorong'ida oy, yorug'da quyosh. */

import { Icon } from "../ui/Icon";
import { usePT } from "../i18n";
import { setThemePref, useResolvedTheme } from "../lib/prefs";
import { savePreferences } from "../data/preferences";

export function ThemeButton() {
  const t = usePT();
  const resolved = useResolvedTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      data-testid="NAV-05"
      aria-label={t(next === "light" ? "theme.toLight" : "theme.toDark")}
      onClick={() => {
        setThemePref(next);
        void savePreferences({ theme: next });
      }}
      className="pn-press grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-pn-border-2 bg-pn-panel-2 text-pn-text hover:border-pn-border-3"
    >
      <Icon name="moon" size={17} className="pn-when-dark" />
      <Icon name="sun" size={17} className="pn-when-light" />
    </button>
  );
}

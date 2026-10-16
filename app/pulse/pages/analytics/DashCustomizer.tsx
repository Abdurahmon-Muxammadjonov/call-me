"use client";

/* "Dashboardni sozlash" oynasi (2026-10-16): bloklarni yashirish/ko'rsatish
 * va tartibini o'zgartirish. Sozlama har foydalanuvchida (data/dashLayout.ts). */

import { usePT } from "../../i18n";
import { Button, IconButton } from "../../ui/primitives";
import { Modal, OverlayHeader } from "../../ui/overlays";
import { Switch } from "../../ui/form";
import { moveSection, toggleSection, type DashLayout, type DashSection } from "../../data/dashLayout";

export function DashCustomizer({
  open,
  onClose,
  layout,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  layout: DashLayout;
  onChange: (l: DashLayout) => void;
  onReset: () => void;
}) {
  const t = usePT();
  return (
    <Modal open={open} onClose={onClose} label={t("dash.title")} testId="DASH-CUSTOMIZER">
      <OverlayHeader title={t("dash.title")} onClose={onClose} />
      <p className="mt-1 text-[13px] text-pn-muted">{t("dash.sub")}</p>
      <ul className="mt-5 flex flex-col gap-2">
        {layout.order.map((id: DashSection, i) => {
          const visible = !layout.hidden.includes(id);
          return (
            <li key={id} className="flex items-center gap-3 rounded-2xl border border-pn-border-2 bg-pn-panel-2 py-2 pl-4 pr-2">
              <Switch checked={visible} onChange={() => onChange(toggleSection(layout, id))} label={t(`dash.s.${id}` as "dash.s.tiles")} testId={`DASH-T-${id}`} />
              <span className={`min-w-0 flex-1 text-[14px] ${visible ? "text-pn-text" : "text-pn-subtle line-through"}`}>{t(`dash.s.${id}` as "dash.s.tiles")}</span>
              <IconButton icon="chevronUp" label={t("dash.up")} size={38} tone="ghost" disabled={i === 0} onClick={() => onChange(moveSection(layout, id, -1))} testId={`DASH-UP-${id}`} />
              <IconButton icon="chevronDown" label={t("dash.down")} size={38} tone="ghost" disabled={i === layout.order.length - 1} onClick={() => onChange(moveSection(layout, id, 1))} testId={`DASH-DOWN-${id}`} />
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex justify-between gap-3">
        <Button variant="link" icon="refresh" onClick={onReset} testId="DASH-RESET">{t("dash.reset")}</Button>
        <Button variant="primary" onClick={onClose}>{t("dash.done")}</Button>
      </div>
    </Modal>
  );
}

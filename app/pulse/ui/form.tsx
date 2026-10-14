"use client";

/* Pulse Noir forma primitivlari (2026-10-14) — CRUD/sozlama bo'limlari
 * (Xodimlar, Audio yuklash, Mezonlar, amoCRM) eski uslubdan ko'chirilganda
 * qo'shildi. Ranglar faqat tokenlar orqali, ikkala mavzuda ishlaydi. */

import {
  forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./Icon";
import { Button, Spinner } from "./primitives";
import { Modal } from "./overlays";
import { TONE_VARS, type Tone } from "../lib/tones";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const FIELD_BASE =
  "w-full rounded-2xl border bg-pn-field text-[14px] text-pn-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-pn-subtle focus:ring-[3px] disabled:opacity-50";
const FIELD_OK = "border-pn-border-2 focus:border-pn-accent focus:ring-pn-accent-ring";
const FIELD_ERR = "border-pn-bad focus:border-pn-bad focus:ring-pn-bad-ring";

export function fieldCls(error?: boolean, extra?: string): string {
  return cx(FIELD_BASE, error ? FIELD_ERR : FIELD_OK, extra);
}

/* Yorliq + ixtiyoriy ikonka + maslahat/xato. Kirish elementiga `id` ni
 * bolalar render-funksiyasi orqali beradi (label ↔ input bog'lanadi). */
export function Field({
  label,
  icon,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  error?: string;
  optional?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="pn-section-label mb-2 flex items-center gap-2 text-pn-muted">
        {icon && <Icon name={icon} size={14} />}
        <span>{label}</span>
        {optional && <span className="font-normal normal-case tracking-normal text-pn-subtle">{optional}</span>}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="mt-[6px] text-[12px] font-medium text-pn-bad-text">{error}</p>
      ) : hint ? (
        <p className="mt-[6px] flex items-center gap-[6px] text-[12px] text-pn-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean; mono?: boolean; right?: ReactNode }
>(function TextInput({ error, mono, right, className, ...rest }, ref) {
  const input = (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={fieldCls(error, cx("h-12 px-4", mono && "pn-mono text-[13px]", right != null && "pr-12", className))}
      {...rest}
    />
  );
  if (right == null) return input;
  return (
    <div className="relative">
      {input}
      <span className="absolute right-[6px] top-1/2 -translate-y-1/2">{right}</span>
    </div>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  function TextArea({ error, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={error || undefined}
        className={fieldCls(error, cx("min-h-[96px] resize-y px-4 py-3 leading-relaxed", className))}
        {...rest}
      />
    );
  }
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  function SelectInput({ error, className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={error || undefined}
          className={fieldCls(error, cx("h-12 cursor-pointer appearance-none pl-4 pr-11", className))}
          {...rest}
        >
          {children}
        </select>
        <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-pn-muted" />
      </div>
    );
  }
);

/* Yoqish/o'chirish tugmasi (role=switch). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={cx(
        "pn-press relative h-7 w-12 shrink-0 rounded-full border disabled:opacity-40",
        checked ? "border-pn-accent bg-pn-accent" : "border-pn-border-2 bg-pn-panel-3"
      )}
    >
      <span
        aria-hidden
        className={cx(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left,background-color] duration-200",
          checked ? "left-[24px] bg-pn-accent-ink" : "left-[3px] bg-pn-text-2"
        )}
      />
    </button>
  );
}

/* Kichik belgilash katakchasi (ro'yxat qatorlari uchun). */
export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "pn-press grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border",
        checked ? "border-pn-accent bg-pn-accent text-pn-accent-ink" : "border-pn-border-3 bg-pn-field text-transparent hover:border-pn-muted"
      )}
    >
      <Icon name="check" size={13} stroke={2.6} />
    </button>
  );
}

/* Ichki xabar qutisi: muvaffaqiyat / jarayon / xato / eslatma. */
export function Notice({
  tone,
  icon,
  busy,
  children,
  className,
  testId,
}: {
  tone: Tone;
  icon?: IconName;
  busy?: boolean;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const v = TONE_VARS[tone];
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      data-testid={testId}
      className={cx("flex items-start gap-[10px] rounded-2xl border px-4 py-3 text-[13px] font-medium leading-relaxed", className)}
      style={{ background: v.tint, color: v.text, borderColor: tone === "neutral" ? "var(--pn-border-2)" : v.ring }}
    >
      <span className="mt-[2px] shrink-0">{busy ? <Spinner size={14} /> : <Icon name={icon ?? (tone === "good" ? "check" : tone === "bad" ? "warning" : "info")} size={15} />}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* Tasdiqlash oynasi (o'chirish va h.k.). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  busy,
  onConfirm,
  onCancel,
  testId = "CONFIRM",
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}) {
  return (
    <Modal open={open} onClose={onCancel} label={title} testId={testId}>
      <div className="flex items-start gap-4">
        {danger && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: TONE_VARS.bad.tint, color: TONE_VARS.bad.text }}>
            <Icon name="trash" size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="pn-card-title">{title}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-pn-text-2">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-[10px]">
        <Button variant="outline" onClick={onCancel} testId={`${testId}-cancel`}>{cancelLabel}</Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          loading={busy}
          disabled={busy}
          testId={`${testId}-ok`}
          className={danger ? "bg-pn-bad! text-white!" : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

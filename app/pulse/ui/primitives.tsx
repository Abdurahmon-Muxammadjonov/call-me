"use client";

/* Pulse Noir asosiy primitivlari (spetsifikatsiya §4.6).
 * Qiymatlar tokenlar orqali — xom hex yo'q. O'lchamlar manbadagi inline
 * uslublardan (source/*.dc.html). */

import Link from "next/link";
import {
  forwardRef, useRef, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { Icon, type IconName } from "./Icon";
import { TONE_VARS, type Tone } from "../lib/tones";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Card */

export type CardPad = "default" | "lg" | "sm" | "tile" | "none";

const CARD_PAD: Record<CardPad, string> = {
  default: "px-6 py-[22px]",
  lg: "px-7 py-6",
  sm: "px-6 pt-5 pb-[18px]",
  tile: "px-5 py-[18px]",
  none: "",
};

export function Card({
  pad = "default",
  className,
  style,
  children,
  as: Tag = "section",
  ...rest
}: {
  pad?: CardPad;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  as?: "section" | "div" | "article";
} & Record<`data-${string}` | `aria-${string}`, string | undefined>) {
  return (
    <Tag
      className={cx(
        "border border-pn-border bg-pn-panel",
        pad === "tile" ? "rounded-[22px]" : "rounded-[26px]",
        CARD_PAD[pad],
        className
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------- Spinner */

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="pn-spin inline-block shrink-0 rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}

/* --------------------------------------------------------------- Button */

export type ButtonVariant = "primary" | "secondary" | "outline" | "light" | "link";

const BTN_BASE =
  "pn-press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full select-none disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "h-[46px] px-5 bg-pn-accent text-pn-accent-ink text-[14px] font-semibold enabled:hover:opacity-90",
  secondary:
    "h-[46px] px-4 border border-pn-border bg-pn-panel text-pn-text text-[14px] font-medium enabled:hover:bg-pn-panel-2",
  outline: "h-[46px] px-4 border border-pn-border-3 bg-transparent text-pn-text text-[13px] font-medium enabled:hover:bg-pn-panel-2",
  light: "h-10 px-4 bg-pn-seg-active-bg text-pn-seg-active-text text-[13px] font-semibold enabled:hover:opacity-90",
  link: "h-auto px-0 bg-transparent text-pn-muted text-[13px] font-medium enabled:hover:text-pn-text",
};

type ButtonProps = {
  variant?: ButtonVariant;
  /* outline: 46 (standart) yoki 40. */
  compact?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  href?: string;
  prefetch?: boolean;
  testId?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { children?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", compact, icon, iconRight, loading, href, prefetch, testId, className, children, disabled, ...rest },
  ref
) {
  const cls = cx(BTN_BASE, BTN_VARIANT[variant], compact && variant === "outline" && "h-10!", className);
  const iconEl = loading ? <Spinner size={16} /> : icon ? <Icon name={icon} size={16} /> : null;
  const body = (
    <>
      {iconEl}
      {children != null && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={14} />}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} prefetch={prefetch} className={cls} data-testid={testId}>
        {body}
      </Link>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      className={cls}
      disabled={disabled}
      aria-busy={loading || undefined}
      data-testid={testId}
      {...rest}
    >
      {body}
    </button>
  );
});

/* Dumaloq ikonka tugmasi: 46 / 42 / 38. `aria-label` MAJBURIY. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    icon: IconName;
    label: string;
    size?: 46 | 42 | 38;
    tone?: "panel" | "panel-2" | "ghost";
    iconSize?: number;
    testId?: string;
    children?: ReactNode;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">
>(function IconButton({ icon, label, size = 46, tone = "panel", iconSize, testId, className, children, ...rest }, ref) {
  const toneCls =
    tone === "panel"
      ? "border-pn-border bg-pn-panel text-pn-text enabled:hover:bg-pn-panel-2"
      : tone === "panel-2"
        ? "border-pn-border-2 bg-pn-panel-2 text-pn-text-2 enabled:hover:text-pn-text enabled:hover:bg-pn-panel-3"
        : "border-pn-border-2 bg-transparent text-pn-subtle enabled:hover:text-pn-text enabled:hover:bg-pn-panel-2";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-testid={testId}
      className={cx(
        "pn-press relative inline-flex shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-40",
        toneCls,
        className
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (size === 46 ? 18 : size === 42 ? 16 : 14)} />
      {children}
    </button>
  );
});

/* ------------------------------------------------------------ Segmented */

export interface SegOption<V extends string> {
  value: V;
  label: ReactNode;
  icon?: IconName;
  count?: ReactNode;
  countTone?: Tone;
  testId?: string;
  /* Ekran o'quvchi uchun to'liq nom (label qisqa bo'lsa). */
  ariaLabel?: string;
}

const SEG_SIZE = {
  lg: "h-9 px-[18px] text-[13px]",
  md: "h-[38px] px-4 text-[13px]",
  sm: "h-[34px] px-3 text-[12px]",
} as const;

/* radiogroup: strelkalar fokusni siljitadi VA tanlaydi (§4.6). */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  size = "md",
  inCard = false,
  ariaLabel,
  className,
  testId,
  stretch = false,
}: {
  value: V;
  onChange: (v: V) => void;
  options: ReadonlyArray<SegOption<V>>;
  size?: keyof typeof SEG_SIZE;
  inCard?: boolean;
  ariaLabel: string;
  className?: string;
  testId?: string;
  /* Konteyner eniga cho'ziladi, tugmalar teng bo'linadi (popover ichida). */
  stretch?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    let next = -1;
    if (dir) next = (idx + dir + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      data-testid={testId}
      className={cx(
        stretch ? "flex w-full" : "inline-flex shrink-0",
        "gap-1 rounded-full border border-pn-border p-1",
        inCard ? "bg-pn-field" : "bg-pn-panel",
        className
      )}
    >
      {options.map((o, i) => {
        const active = i === idx;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={cx(
              "pn-press inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-full",
              SEG_SIZE[size],
              stretch && "min-w-0 flex-1",
              active
                ? "bg-pn-seg-active-bg font-semibold text-pn-seg-active-text"
                : "bg-transparent font-medium text-pn-muted hover:text-pn-text"
            )}
          >
            {o.icon && <Icon name={o.icon} size={15} className="-ml-0.5 mr-[1px]" />}
            {o.label}
            {o.count != null && (
              <span
                className="pn-mono"
                style={!active && o.countTone && o.countTone !== "neutral" ? { color: TONE_VARS[o.countTone].fg } : undefined}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------- Pills & chips */

const DELTA_SIZE = {
  sm: "h-[26px] px-[9px] text-[12px]",
  md: "h-7 px-[10px] text-[12px]",
  lg: "h-[30px] px-3 text-[13px]",
} as const;

/* ↑ / ↓ strelka bilan o'zgarish. Qiymat formatlangan holda keladi. */
export function DeltaPill({
  tone,
  children,
  size = "md",
  arrow,
  className,
  style,
  testId,
}: {
  tone: Tone;
  children: ReactNode;
  size?: keyof typeof DELTA_SIZE;
  arrow?: "up" | "down" | null;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}) {
  const t = TONE_VARS[tone];
  return (
    <span
      data-testid={testId}
      className={cx("pn-mono inline-flex shrink-0 items-center gap-1 rounded-full font-semibold", DELTA_SIZE[size], className)}
      style={{ background: t.tint, color: t.soft, ...style }}
    >
      {arrow === "up" ? "↑" : arrow === "down" ? "↓" : null}
      {children}
    </span>
  );
}

export function StatusPill({
  tone,
  children,
  plain = false,
  className,
  testId,
}: {
  tone: Tone;
  children: ReactNode;
  plain?: boolean;
  className?: string;
  testId?: string;
}) {
  const t = TONE_VARS[tone];
  return (
    <span
      data-testid={testId}
      className={cx(
        "inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full font-semibold",
        plain ? "h-[26px] px-[10px] text-[12px]" : "h-7 px-3 text-[12px]",
        className
      )}
      style={{ background: t.tint, color: t.soft }}
    >
      {!plain && <span aria-hidden className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: t.fg }} />}
      {children}
    </span>
  );
}

export function ScoreChip({
  tone,
  children,
  size = "md",
  className,
}: {
  tone: Tone;
  children: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  const t = TONE_VARS[tone];
  return (
    <span
      className={cx(
        "pn-mono inline-flex shrink-0 items-center justify-center font-semibold text-[13px]",
        size === "lg" ? "h-[30px] w-11 rounded-[9px]" : "h-7 rounded-lg px-[10px]",
        className
      )}
      style={{ background: t.tint, color: t.soft }}
    >
      {children}
    </span>
  );
}

export function CoverageChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE_VARS[tone];
  return (
    <span
      className="pn-mono inline-flex h-[26px] shrink-0 items-center rounded-lg px-[10px] text-[12px] font-semibold"
      style={{ background: t.tint, color: t.soft }}
    >
      {children}
    </span>
  );
}

const EXT_SIZE = {
  audio: "min-w-[46px] h-8 rounded-[10px] text-[13px]",
  team: "min-w-11 h-8 rounded-[10px] text-[13px]",
  card: "min-w-10 h-[38px] rounded-[11px] text-[13px]",
  tahlil: "min-w-10 h-7 rounded-lg text-[12px]",
} as const;

export function ExtBadge({
  children,
  size = "team",
  selected = false,
  className,
}: {
  children: ReactNode;
  size?: keyof typeof EXT_SIZE;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "pn-mono inline-flex shrink-0 items-center justify-center px-[6px] font-semibold",
        EXT_SIZE[size],
        selected ? "bg-pn-accent text-pn-accent-ink" : "bg-pn-panel-3 text-pn-text-4",
        className
      )}
    >
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  testId,
  ariaPressed = true,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ? active : undefined}
      data-testid={testId}
      className={cx(
        "pn-press inline-flex h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-[14px] text-[13px] font-medium",
        active
          ? "bg-pn-seg-active-bg text-pn-seg-active-text"
          : "border border-pn-border-2 bg-pn-panel-2 text-pn-text-2 hover:text-pn-text"
      )}
    >
      {children}
    </button>
  );
}

/* Menyu nishoni (§6.0): faol bandda siyoh 14%, aks holda --bad 16%. */
export function CountBadge({ value, onAccent = false }: { value: ReactNode; onAccent?: boolean }) {
  return (
    <span
      className={cx(
        "pn-mono inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-[7px] text-[11px] font-semibold",
        onAccent ? "bg-pn-on-accent-badge text-pn-accent-ink" : "text-pn-bad-soft"
      )}
      style={onAccent ? undefined : { background: "color-mix(in srgb, var(--pn-bad) 16%, transparent)" }}
    >
      {value}
    </span>
  );
}

/* Jonli nuqta (§6.1): 8 px, ulangan bo'lsa 4 px halo. */
export function LiveDot({ state }: { state: "connected" | "reconnecting" | "offline" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        state === "connected" && "pn-halo-good bg-pn-good",
        state === "reconnecting" && "bg-pn-warn",
        state === "offline" && "bg-pn-faint"
      )}
    />
  );
}

/* ------------------------------------------------------------- Skeleton */

export function Skeleton({
  w,
  h,
  r = 8,
  className,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cx("pn-skeleton block", className)}
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

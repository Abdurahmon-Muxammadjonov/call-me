"use client";

/* Sana tanlagich (A3, spetsifikatsiya §5.1): Popover 320 px, sarlavhada oy
 * nomi va oldingi/keyingi tugmalar (32 px), hafta kunlari dushanbadan,
 * 36×36 kataklar. Holatlar: bugun — --accent-strong halqa; tanlangan —
 * --accent; oraliqda — --accent-soft; o'chirilgan — kelajak va
 * firstDataDay'dan oldingi kunlar.
 * Rejimlar: single (kun), week (dushanba–yakshanba qatori), month (3×4 oy
 * va yil almashtirgich). Klaviatura: strelkalar, PageUp/PageDown — oy
 * (oy rejimida yil), Enter — tanlash, Esc — yopish (Popover). */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Popover } from "./overlays";
import { Icon } from "./Icon";
import { usePT } from "../i18n";
import {
  addDays, daysInMonth, isoWeekday, monthName, shiftMonth, weekStart, weekdayShort, type Loc,
} from "../lib/dates";

export type PickerMode = "single" | "week" | "month";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export function DatePicker({
  open,
  onClose,
  anchorRef,
  mode,
  value,
  onSelect,
  today,
  min,
  loc,
  label,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  mode: PickerMode;
  /* single: kun; week: hafta boshi (dushanba); month: oyning 1-kuni. */
  value: string;
  onSelect: (day: string) => void;
  today: string;
  min?: string | null;
  loc: Loc;
  label: string;
  testId?: string;
}) {
  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      placement="bottom-end"
      width={320}
      label={label}
      testId={testId}
      className="p-3"
    >
      {open && (mode === "month" ? (
        <MonthGrid value={value} onSelect={(d) => { onSelect(d); onClose(); }} today={today} min={min} loc={loc} />
      ) : (
        <DayGrid mode={mode} value={value} onSelect={(d) => { onSelect(d); onClose(); }} today={today} min={min} loc={loc} />
      ))}
    </Popover>
  );
}

function NavButton({ dir, label, onClick }: { dir: "prev" | "next"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pn-press grid h-8 w-8 place-items-center rounded-full border border-pn-border-2 text-pn-text-2 hover:bg-pn-panel-2 hover:text-pn-text"
    >
      <Icon name={dir === "prev" ? "chevronLeft" : "chevronRight"} size={14} stroke={2} />
    </button>
  );
}

function DayGrid({
  mode,
  value,
  onSelect,
  today,
  min,
  loc,
}: {
  mode: "single" | "week";
  value: string;
  onSelect: (d: string) => void;
  today: string;
  min?: string | null;
  loc: Loc;
}) {
  const t = usePT();
  const [month, setMonth] = useState(value.slice(0, 7));
  const [focus, setFocus] = useState(value);
  const [hoverWeek, setHoverWeek] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const first = `${month}-01`;
  const lead = isoWeekday(first);
  const cells = useMemo(() => {
    const n = daysInMonth(month);
    const out: Array<string | null> = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= n; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month, lead]);

  const disabled = (d: string) => d > today || (!!min && d < min);
  const selWeek = mode === "week" ? value : null;
  const activeWeek = mode === "week" ? hoverWeek ?? selWeek : null;
  const inWeek = (d: string) => activeWeek != null && d >= activeWeek && d <= addDays(activeWeek, 6);

  // Fokus oy almashganda ham kataklarda qolsin.
  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`);
    el?.focus({ preventScroll: true });
  }, [focus, month]);

  function move(to: string) {
    setFocus(to);
    if (to.slice(0, 7) !== month) setMonth(to.slice(0, 7));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      move(addDays(focus, step[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const m = shiftMonth(focus.slice(0, 7), e.key === "PageUp" ? -1 : 1);
      move(`${m}-${String(Math.min(Number(focus.slice(8, 10)), daysInMonth(m))).padStart(2, "0")}`);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled(focus)) onSelect(mode === "week" ? weekStart(focus) : focus);
    }
  }

  const m1 = Number(month.slice(5, 7));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <NavButton dir="prev" label={t("dp.prevMonth")} onClick={() => setMonth(shiftMonth(month, -1))} />
        <span className="text-[13px] font-semibold capitalize" aria-live="polite">
          {monthName(loc, m1)} {month.slice(0, 4)}
        </span>
        <NavButton dir="next" label={t("dp.nextMonth")} onClick={() => setMonth(shiftMonth(month, 1))} />
      </div>
      <div className="grid grid-cols-7 gap-[6px] text-center text-[11px] text-pn-subtle" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{weekdayShort(loc, i)}</span>
        ))}
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label={`${monthName(loc, m1)} ${month.slice(0, 4)}`}
        onKeyDown={onKey}
        onPointerLeave={() => setHoverWeek(null)}
        className="grid grid-cols-7 gap-[6px]"
      >
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} aria-hidden className="h-9" />;
          const off = disabled(d);
          const selected = mode === "single" ? d === value : false;
          const weekEdge = mode === "week" && activeWeek != null && (d === activeWeek || d === addDays(activeWeek, 6));
          const inRange = mode === "week" && inWeek(d);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              data-day={d}
              data-testid={`dp-${d}`}
              tabIndex={d === focus ? 0 : -1}
              aria-selected={selected || (mode === "week" && selWeek != null && d >= selWeek && d <= addDays(selWeek, 6))}
              aria-disabled={off || undefined}
              aria-current={d === today ? "date" : undefined}
              onPointerEnter={() => mode === "week" && !off && setHoverWeek(weekStart(d))}
              onFocus={() => mode === "week" && setHoverWeek(weekStart(d))}
              onClick={() => {
                if (off) return;
                setFocus(d);
                onSelect(mode === "week" ? weekStart(d) : d);
              }}
              className={cx(
                "pn-mono grid h-9 place-items-center rounded-[10px] text-[13px] transition-colors",
                off && "cursor-not-allowed text-pn-faint",
                !off && !selected && !inRange && "text-pn-text hover:bg-pn-panel-2",
                selected && "bg-pn-accent font-semibold text-pn-accent-ink",
                inRange && !weekEdge && "bg-pn-accent-soft text-pn-text",
                weekEdge && "bg-pn-accent font-semibold text-pn-accent-ink",
                d === today && !selected && !weekEdge && "ring-1 ring-inset ring-pn-accent-strong"
              )}
            >
              {Number(d.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  value,
  onSelect,
  today,
  min,
  loc,
}: {
  value: string;
  onSelect: (d: string) => void;
  today: string;
  min?: string | null;
  loc: Loc;
}) {
  const t = usePT();
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const [focus, setFocus] = useState(Number(value.slice(5, 7)));
  const gridRef = useRef<HTMLDivElement>(null);
  const key = (m: number) => `${year}-${String(m).padStart(2, "0")}`;
  const disabled = (m: number) => `${key(m)}-01` > today || (!!min && key(m) < min.slice(0, 7));

  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus, year]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    if (e.key in step) {
      e.preventDefault();
      let m = focus + step[e.key];
      let y = year;
      if (m < 1) { m += 12; y -= 1; }
      if (m > 12) { m -= 12; y += 1; }
      setYear(y);
      setFocus(m);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      setYear((y) => y + (e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled(focus)) onSelect(`${key(focus)}-01`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <NavButton dir="prev" label={t("dp.prevYear")} onClick={() => setYear((y) => y - 1)} />
        <span className="pn-mono text-[13px] font-semibold" aria-live="polite">{year}</span>
        <NavButton dir="next" label={t("dp.nextYear")} onClick={() => setYear((y) => y + 1)} />
      </div>
      <div ref={gridRef} role="grid" aria-label={String(year)} onKeyDown={onKey} className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const off = disabled(m);
          const selected = value.slice(0, 7) === key(m);
          const current = today.slice(0, 7) === key(m);
          return (
            <button
              key={m}
              type="button"
              role="gridcell"
              data-month={m}
              data-testid={`dp-${key(m)}`}
              tabIndex={m === focus ? 0 : -1}
              aria-selected={selected}
              aria-disabled={off || undefined}
              onClick={() => !off && onSelect(`${key(m)}-01`)}
              className={cx(
                "h-11 rounded-[10px] text-[13px] capitalize transition-colors",
                off && "cursor-not-allowed text-pn-faint",
                !off && !selected && "text-pn-text hover:bg-pn-panel-2",
                selected && "bg-pn-accent font-semibold text-pn-accent-ink",
                current && !selected && "ring-1 ring-inset ring-pn-accent-strong"
              )}
            >
              {monthName(loc, m, "short")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

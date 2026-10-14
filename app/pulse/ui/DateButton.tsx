"use client";

/* "📅 Sana" tugmasi (2026-10-14) — har bo'lim sarlavhasida bir xil.
 * Bosilganda kalendar ochiladi: kompaniyaning birinchi qo'ng'iroq kunidan
 * bugungacha bo'lgan kunlar tanlanadi, qo'ng'iroq bo'lgan kunlar nuqta
 * bilan belgilangan (maslahatda soni). Tanlangan kun bo'lim URL'ida
 * (?date=), ya'ni havola bilan ulashiladi va orqaga tugmasi ishlaydi. */

import { useRef, useState } from "react";
import { DatePicker } from "./DatePicker";
import { Icon } from "./Icon";
import { usePT } from "../i18n";
import { useLocale } from "../../lib/i18n";
import { useCallDays } from "../data/callDays";
import { addDays, dayMonth, weekdayName, type Loc } from "../lib/dates";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export function DateButton({
  date,
  today,
  onChange,
  testId = "DATE-BTN",
}: {
  date: string;
  today: string;
  onChange: (day: string) => void;
  testId?: string;
}) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { data } = useCallDays();
  const yesterday = addDays(today, -1);
  const label = date === today ? t("date.today") : date === yesterday ? t("date.yesterday") : dayMonth(loc, date);
  const count = data?.counts.get(date) ?? (data ? 0 : null);

  const quick = (d: string, text: string, id: string) => (
    <button
      type="button"
      data-testid={`${testId}-${id}`}
      disabled={!!data?.firstDay && d < data.firstDay}
      onClick={() => { onChange(d); setOpen(false); }}
      className={cx(
        "pn-press h-8 rounded-full border px-3 text-[12px] font-medium disabled:opacity-40",
        d === date ? "border-pn-accent bg-pn-accent text-pn-accent-ink" : "border-pn-border-2 text-pn-text-2 hover:bg-pn-panel-2 hover:text-pn-text"
      )}
    >
      {text}
    </button>
  );

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "pn-press inline-flex h-[46px] items-center gap-[10px] rounded-full border px-4 text-[13px] font-medium",
          date === today
            ? "border-pn-border bg-pn-panel text-pn-text hover:bg-pn-panel-2"
            : "border-pn-border-3 bg-pn-panel-2 text-pn-text hover:bg-pn-panel-3"
        )}
      >
        {/* O'tgan kun tanlangan — kichik qizil nuqta (aksent faqat urg'u uchun). */}
        {date !== today && <span aria-hidden className="-mr-1 h-[6px] w-[6px] rounded-full bg-pn-accent" />}
        <Icon name="calendar" size={16} />
        <span className="text-pn-subtle">{t("date.button")}</span>
        <span className="font-semibold">{label}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      <DatePicker
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        mode="single"
        value={date}
        onSelect={onChange}
        today={today}
        min={data?.firstDay ?? null}
        loc={loc}
        label={t("date.pickerLabel")}
        testId={`${testId}-PICKER`}
        marks={data?.counts ?? null}
        markTitle={(n) => t("date.callsOnDay", { n })}
        footer={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[12px] text-pn-subtle">
              <span className="first-letter:uppercase">{weekdayName(loc, date)}, {dayMonth(loc, date)}</span>
              {count != null && <span className="pn-mono text-pn-text-2">{t("date.callsOnDay", { n: count })}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {quick(today, t("date.today"), "today")}
              {quick(yesterday, t("date.yesterday"), "yesterday")}
              {data?.firstDay && data.firstDay < yesterday && quick(data.firstDay, t("date.first"), "first")}
            </div>
          </div>
        }
      />
    </>
  );
}

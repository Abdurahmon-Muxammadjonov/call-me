"use client";

/* Umumiy filtr qatori (2026-10-15, foydalanuvchi talabi: "har bir bo'limga
 * filtr qo'yish kerak"). Qidiruv maydoni + bir tanlovli chiplar (soni bilan).
 * Holat chaqiruvchida (odatda URL — ?q= va ?f=), shuning uchun havola bilan
 * ulashiladi va orqaga tugmasi ishlaydi. */

import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { usePT } from "../i18n";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export interface FilterOption<V extends string> {
  value: V;
  label: ReactNode;
  count?: number | null;
}

export function FilterBar<V extends string>({
  search,
  options,
  value,
  onChange,
  ariaLabel,
  testId = "FILTER",
  className,
  right,
}: {
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  options?: ReadonlyArray<FilterOption<V>>;
  value?: V;
  onChange?: (v: V) => void;
  ariaLabel: string;
  testId?: string;
  className?: string;
  right?: ReactNode;
}) {
  const t = usePT();
  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)} data-testid={testId}>
      {options && options.length > 0 && (
        <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1 rounded-full border border-pn-border bg-pn-panel-2 p-1">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange?.(o.value)}
                data-testid={`${testId}-${o.value}`}
                className={cx(
                  "pn-press inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-full px-3 text-[12px] font-medium",
                  active ? "bg-pn-seg-active-bg text-pn-seg-active-text" : "text-pn-text-2 hover:text-pn-text"
                )}
              >
                {o.label}
                {o.count != null && (
                  <span className={cx("pn-mono text-[11px]", active ? "opacity-70" : "text-pn-subtle")}>{o.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {search && (
        <label className="flex h-[42px] min-w-[200px] flex-1 items-center gap-2 rounded-full border border-pn-border-2 bg-pn-field px-4 sm:max-w-[300px]">
          <Icon name="search" size={15} className="shrink-0 text-pn-subtle" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-pn-text outline-none placeholder:text-pn-subtle"
            data-testid={`${testId}-search`}
          />
          {search.value && (
            <button type="button" onClick={() => search.onChange("")} aria-label={t("filter.clear")} className="text-pn-subtle hover:text-pn-text">
              <Icon name="close" size={13} />
            </button>
          )}
        </label>
      )}
      {right}
    </div>
  );
}

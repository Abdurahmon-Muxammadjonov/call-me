"use client";

/* Jadval primitivlari (§4.6). Maketlardagi jadvallar CSS grid ustunlari
 * bilan chizilgan — shu sabab div + ARIA rollari (table/row/columnheader/
 * cell). Sarlavha qatori 36–38 px, yuqori/pastki --border; qatorlar
 * --divider bilan ajraladi; hover --row-open, tanlangan --row-selected.
 * Saralanadigan ustunlar (A11): 10 px strelka + aria-sort. */

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { Icon } from "./Icon";

export type SortDir = "asc" | "desc";

export interface Column {
  key: string;
  label: ReactNode;
  align?: "left" | "right" | "center";
  /* Berilsa — ustun saralanadi. */
  sortable?: boolean;
}

function justify(a: Column["align"]): CSSProperties["justifyContent"] {
  return a === "right" ? "flex-end" : a === "center" ? "center" : "flex-start";
}

export function TableHead({
  columns,
  template,
  padX = 24,
  height = 38,
  sort,
  onSort,
  gap = 16,
}: {
  columns: ReadonlyArray<Column>;
  template: string;
  padX?: number;
  height?: 36 | 38;
  sort?: { key: string; dir: SortDir } | null;
  onSort?: (key: string) => void;
  gap?: number;
}) {
  return (
    <div
      role="row"
      className="pn-table-head grid items-center border-y border-pn-border"
      style={{ gridTemplateColumns: template, columnGap: gap, height, paddingInline: padX }}
    >
      {columns.map((c) => {
        const active = sort?.key === c.key;
        const ariaSort = c.sortable ? (active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none") : undefined;
        if (!c.sortable || !onSort) {
          return (
            <div key={c.key} role="columnheader" className="flex min-w-0 items-center" style={{ justifyContent: justify(c.align) }}>
              <span className="truncate">{c.label}</span>
            </div>
          );
        }
        return (
          <div key={c.key} role="columnheader" aria-sort={ariaSort} className="flex min-w-0 items-center" style={{ justifyContent: justify(c.align) }}>
            <button
              type="button"
              onClick={() => onSort(c.key)}
              className="pn-table-head inline-flex min-w-0 items-center gap-1 hover:text-pn-text"
              style={{ color: active ? "var(--pn-text-2)" : undefined }}
            >
              <span className="truncate">{c.label}</span>
              {active && <Icon name={sort!.dir === "asc" ? "chevronUp" : "chevronDown"} size={10} stroke={2.4} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function TableRow({
  template,
  padX = 24,
  height,
  gap = 16,
  selected = false,
  onActivate,
  children,
  testId,
  label,
  className,
  onPointerEnter,
  onFocus,
}: {
  template: string;
  padX?: number;
  height?: number;
  gap?: number;
  selected?: boolean;
  /* Berilsa — qator bosiladi (Enter/Space ham ishlaydi). */
  onActivate?: () => void;
  children: ReactNode;
  testId?: string;
  label?: string;
  className?: string;
  onPointerEnter?: () => void;
  onFocus?: () => void;
}) {
  const interactive = !!onActivate;
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!onActivate) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  }
  return (
    <div
      role="row"
      tabIndex={interactive ? 0 : undefined}
      aria-selected={interactive ? selected : undefined}
      aria-label={label}
      data-testid={testId}
      onClick={onActivate}
      onKeyDown={onKey}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      className={`pn-focus-inset grid items-center border-b border-pn-divider transition-colors ${
        selected ? "bg-pn-row-selected" : interactive ? "hover:bg-pn-row-open" : ""
      } ${interactive ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{ gridTemplateColumns: template, columnGap: gap, minHeight: height, paddingInline: padX }}
    >
      {children}
    </div>
  );
}

export function Cell({
  children,
  align,
  className,
  mono,
}: {
  children?: ReactNode;
  align?: Column["align"];
  className?: string;
  mono?: boolean;
}) {
  return (
    <div
      role="cell"
      className={`flex min-w-0 items-center ${mono ? "pn-mono" : ""} ${className ?? ""}`}
      style={{ justifyContent: justify(align) }}
    >
      {children}
    </div>
  );
}

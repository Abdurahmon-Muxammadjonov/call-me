"use client";

import { useCompany } from "../lib/company";
import { Skeleton } from "./ui";

const AVATAR_COLORS = [
  "#3B5FE3", // brand blue
  "#2DD4BF", // brand teal
  "#F59E0B", // amber
  "#EF4444", // rose
  "#8B5CF6", // violet
  "#10B981", // emerald
  "#EC4899", // pink
  "#0EA5E9", // sky
];

/* Deterministic: the same company.id always lands on the same color, on
 * every device and every reload — nothing here depends on render order or
 * random state. */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function colorForCompany(id: string): string {
  return AVATAR_COLORS[hashCode(id) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/* Sidebar company identity — sits under the SalesPulse brand mark so the
 * platform brand never disappears, but the specific company you're
 * actually looking at is always visible too. Logo when the company has
 * uploaded one; otherwise a deterministic-color initials avatar so every
 * company still reads as visually distinct at a glance. */
export function CompanyBadge() {
  const { company, loading } = useCompany();

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="flex items-center gap-2.5 px-1">
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- company logos are arbitrary external URLs, not a known-optimizable local/remote pattern
        <img
          src={company.logo_url}
          alt={company.name}
          className="h-8 w-8 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: colorForCompany(company.id) }}
        >
          {initialsFor(company.name)}
        </span>
      )}
      <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{company.name}</span>
    </div>
  );
}

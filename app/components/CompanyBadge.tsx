"use client";

import { ChevronDown } from "lucide-react";

import { useCompany } from "../lib/company";
import { Skeleton } from "./ui";


/* Deterministic: the same company.id always lands on the same color, on
 * every device and every reload — nothing here depends on render order or
 * random state. */


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

  /* Yon menyudagi kompaniya tanlagichi (spetsifikatsiya 2.1): balandlik
     48px, radius 12px, chapda 28px belgi, o'ngda pastga strelka. */
  return (
    <div
      className="flex h-12 items-center gap-2.5 rounded-xl px-2.5"
      style={{ background: "var(--control)", border: "1px solid var(--border-company)" }}
    >
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- company logos are arbitrary external URLs, not a known-optimizable local/remote pattern
        <img
          src={company.logo_url}
          alt={company.name}
          className="h-7 w-7 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: "var(--company-avatar)" }}
        >
          {initialsFor(company.name)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: "var(--text)" }}>
        {company.name}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0" color="#8C95A6" aria-hidden />
    </div>
  );
}

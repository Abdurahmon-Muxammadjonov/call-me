/* TEST FIXTURE — faqat testlar uchun. Maketdagi namuna qiymatlar
 * ("JAMALS INTERNATIONAL", "Pro", 12 operator, 41 …) FAQAT shu yerda
 * bo'lishi mumkin (spetsifikatsiya §0.2) — ilova kodi bu faylni hech
 * qachon import qilmaydi, ishlab chiqarish bundle'iga tushmaydi. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserContext, Page, Route } from "@playwright/test";
import { dailySummary, hourly, todayCalls, TODAY } from "./analytics";

function apiBase(): string {
  const env = readFileSync(join(__dirname, "..", "..", ".env.local"), "utf8");
  const m = env.match(/^NEXT_PUBLIC_API_URL=(.+)$/m);
  if (!m) throw new Error(".env.local da NEXT_PUBLIC_API_URL yo'q");
  return m[1].trim().replace(/\/+$/, "");
}

export const API = apiBase();

export interface BackendOptions {
  companyName?: string;
  tariffName?: string | null;
  managers?: number;
  lowScoreToday?: number;
  /* Tarifda yopiq bo'limlar (section_key). */
  locked?: string[];
  /* Har bir so'rov yo'li — tekshirish uchun. */
  log?: string[];
  /* Analitika maketi ma'lumotlari (tests/fixtures/analytics.ts). */
  analytics?: boolean;
  /* Analitika so'rovlari muvaffaqiyatsiz (xato holatini tekshirish). */
  analyticsError?: boolean;
}

function tashkentToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

const SECTION_KEYS = ["reports", "managers", "call_analytics", "criteria_categories", "criteria"];

function ok(data: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

export function managersFixture(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, name: `Operator ${100 + i}`, status: "active" }));
}

/* Brauzerdan API'ga ketadigan HAR BIR so'rov shu yerda tugaydi. */
export async function mockBackend(target: Page | BrowserContext, opts: BackendOptions = {}): Promise<void> {
  const {
    companyName = "JAMALS INTERNATIONAL",
    tariffName = "Pro",
    managers = 12,
    lowScoreToday = 41,
    locked = [],
    log,
    analytics = false,
    analyticsError = false,
  } = opts;
  const calls = analytics ? todayCalls() : [];
  await target.route(`${API}/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    log?.push(`${route.request().method()} ${path}${url.search}`);
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    switch (path) {
      case "/company/me":
        return route.fulfill(
          ok({
            id: "c1",
            name: companyName,
            logo_url: null,
            plan: "pro",
            tariff: tariffName ? { key: "pro", name: tariffName, included_sections: SECTION_KEYS } : null,
            created_at: "2026-01-01T00:00:00Z",
          })
        );
      case "/dashboard/stats":
        return route.fulfill(ok({ total_calls: 0, total_campaigns: 0, avg_score: null, calls_this_month: 0, active_agents: managers }));
      case "/company/sections":
        return route.fulfill(
          ok(SECTION_KEYS.map((k) => ({ section_key: k, is_locked: locked.includes(k), in_plan: true })))
        );
      case "/managers":
        return route.fulfill(ok(managersFixture(managers)));
      case "/company/settings":
        return route.fulfill(
          ok({
            qualified_call_seconds: 60,
            min_qualified_calls_day: 40,
            min_qualified_calls_week: 200,
            min_qualified_calls_month: 800,
            min_efficiency_score: 60,
          })
        );
      case "/analytics/daily-summary":
        if (analyticsError && Number(url.searchParams.get("days")) > 1) return route.fulfill({ status: 500, body: "{}" });
        if (analytics) {
          return route.fulfill(ok(dailySummary(Number(url.searchParams.get("days") || 1), url.searchParams.get("until"))));
        }
        return route.fulfill(
          ok([
            {
              date: tashkentToday(),
              calls: 0, minutes: 0, analyzed: 0, scored: 0, avg_score: 0,
              low_score: lowScoreToday,
              long_calls: 0, operator_calls: 0, penalty_sum: 0, bonus_sum: 0,
              incoming: 0, outgoing: 0, leads: 0, invited: 0, closed: 0, bad_leads: 0, unanswered: 0,
            },
          ])
        );
      case "/analytics/hourly":
        return route.fulfill(ok(analytics ? hourly() : []));
      case "/api/calls": {
        if (!analytics || url.searchParams.get("date") !== TODAY) return route.fulfill(ok([]));
        const limit = Number(url.searchParams.get("limit") || 200);
        const offset = Number(url.searchParams.get("offset") || 0);
        return route.fulfill(ok(calls.slice(offset, offset + limit)));
      }
      default:
        // Boshqa hamma narsa: bo'sh ro'yxat. Tashqi tarmoqqa HECH QACHON o'tmaydi.
        return route.fulfill(ok([]));
    }
  });
}

export interface SeedOptions {
  theme?: "dark" | "light" | "system";
  locale?: "uz" | "ru" | "en";
  name?: string;
}

/* Sessiya (localStorage) va afzallik cookie'lari — sahifa skriptlaridan oldin. */
export async function seedSession(context: BrowserContext, baseURL: string, opts: SeedOptions = {}): Promise<void> {
  const { theme = "dark", locale, name = "Abdurahmon Test" } = opts;
  const session = {
    session: {
      role: "director",
      email: "director@test.local",
      name,
      title: "Rahbar",
      employeeId: "u1",
      rawRole: "director",
      token: "test-token",
    },
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
  };
  await context.addInitScript((s) => {
    try {
      if (!sessionStorage.getItem("__seeded")) {
        localStorage.setItem("procell-session", s);
        sessionStorage.setItem("__seeded", "1");
      }
    } catch {
      /* e'tiborsiz */
    }
  }, JSON.stringify(session));
  const host = new URL(baseURL).hostname;
  const cookies: Array<{ name: string; value: string; domain: string; path: string }> = [
    { name: "sp_theme", value: theme, domain: host, path: "/" },
  ];
  if (locale) cookies.push({ name: "sp_locale", value: locale, domain: host, path: "/" });
  await context.addCookies(cookies);
}

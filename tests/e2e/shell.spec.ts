/* 1-bosqich: doimiy qobiq va yon menyu (spetsifikatsiya §6.0, §6.1).
 * Har bir boshqaruv ID'si kamida bitta test bilan qoplanadi. */

import { expect, test, type Page } from "@playwright/test";
import { mockBackend, seedSession } from "../fixtures/backend";

const MAIN = [
  ["analytics", "/dashboard", "Analitika"],
  ["control", "/dashboard/management", "Boshqaruv paneli"],
  ["compare", "/dashboard/comparison", "Solishtirish paneli"],
  ["staffManage", "/dashboard/staff", "Xodimlarni boshqarish"],
  ["staffStats", "/dashboard/staff-stats", "Xodimlar statistikasi"],
  ["status", "/dashboard/analysis-status", "Tahlil holati"],
  ["audio", "/dashboard/recordings", "Audio yozuvlar"],
  ["upload", "/dashboard/upload", "Audio yuklash"],
  ["deep", "/dashboard/deep-audit", "Chuqur tahlil"],
  ["operators", "/dashboard/operators", "Operatorlar"],
  ["categories", "/dashboard/categories", "Mezon kategoriyalari"],
  ["criteria", "/dashboard/criteria", "Baholash mezonlari"],
  ["amocrm", "/dashboard/amocrm", "amoCRM ulanishi"],
  ["brand", "/settings/branding", "Brend sozlamalari"],
  ["norms", "/settings/norms", "KPI normalari"],
] as const;

async function open(page: Page, path = "/dashboard/upload") {
  await page.goto(path);
  await expect(page.getByTestId("NAV-02")).toContainText("JAMALS INTERNATIONAL");
}

test.beforeEach(async ({ context, baseURL }) => {
  await mockBackend(context);
  await seedSession(context, baseURL!);
});

test("NAV-03: 15 ta band, to'g'ri havola va nom, faol bandda aria-current", async ({ page }) => {
  await open(page);
  for (const [id, href, label] of MAIN) {
    const item = page.getByTestId(`NAV-03-${id}`).first();
    await expect(item).toHaveAttribute("href", href);
    await expect(item).toContainText(label);
  }
  await expect(page.getByTestId("NAV-03-upload").first()).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
});

test("NAV-03: bosilganda sahifa almashadi, qobiq qayta o'rnatilmaydi", async ({ page }) => {
  await open(page);
  // Qobiq elementiga belgi qo'yamiz — to'liq qayta yuklanish yoki remount bo'lsa yo'qoladi.
  await page.getByTestId("NAV").evaluate((el) => ((el as HTMLElement & { __mark?: number }).__mark = 42));
  await page.getByTestId("NAV-03-control").first().click();
  await expect(page).toHaveURL(/\/dashboard\/management$/);
  await expect(page.getByTestId("NAV-03-control").first()).toHaveAttribute("aria-current", "page");
  await page.getByTestId("NAV-03-norms").first().click();
  await expect(page).toHaveURL(/\/settings\/norms$/);
  const mark = await page.getByTestId("NAV").evaluate((el) => (el as HTMLElement & { __mark?: number }).__mark);
  expect(mark).toBe(42);
});

test("NAV-01: logotip Analitikaga olib boradi", async ({ page }) => {
  await open(page);
  await page.getByTestId("NAV-01").first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("NAV-03-analytics").first()).toHaveAttribute("aria-current", "page");
});

test("NAV-02: kompaniya, tarif va operatorlar soni /me dan", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("NAV-02")).toContainText("Pro tarif · 12 operator");
  await expect(page.getByTestId("NAV-02")).toContainText("JI");
});

test("NAV-02: popover — foydalanuvchi, havolalar, mavzu, chiqish", async ({ page, context }) => {
  await open(page);
  await page.getByTestId("NAV-02").click();
  const pop = page.getByTestId("NAV-02-popover");
  await expect(pop).toBeVisible();
  await expect(pop).toContainText("Abdurahmon Test");
  await expect(pop).toContainText("Rahbar");
  // Bitta kompaniya — ro'yxat ko'rsatilmaydi.
  await expect(pop.getByRole("listbox")).toHaveCount(0);

  // Mavzu: Yorug' → data-theme va cookie.
  await page.getByTestId("NAV-02-theme-light").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect((await context.cookies()).find((c) => c.name === "sp_theme")?.value).toBe("light");
  // Tizim: prefers-color-scheme ga ergashadi.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByTestId("NAV-02-theme-system").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Esc yopadi, fokus trigger'ga qaytadi.
  await page.keyboard.press("Escape");
  await expect(pop).toBeHidden();
  await expect(page.getByTestId("NAV-02")).toBeFocused();

  // Brend sozlamalari havolasi.
  await page.getByTestId("NAV-02").click();
  await page.getByTestId("NAV-02-brand").click();
  await expect(page).toHaveURL(/\/settings\/branding$/);
});

test("NAV-02: hisobdan chiqish — tasdiq, sessiya va kesh tozalanadi, /login", async ({ page }) => {
  await open(page);
  await page.getByTestId("NAV-02").click();
  await page.getByTestId("NAV-02-logout").click();
  await expect(page.getByTestId("NAV-02-logout-modal")).toBeVisible();
  await page.getByTestId("NAV-02-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem("procell-session"))).toBeNull();
});

test("NAV-04: til — Русский tanlansa matnlar, lang va cookie almashadi", async ({ page, context }) => {
  await open(page);
  await page.getByTestId("NAV-04").click();
  await expect(page.getByTestId("NAV-04-popover")).toBeVisible();
  await expect(page.getByTestId("NAV-04-uz")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("NAV-04-ru").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByTestId("NAV-03-analytics").first()).toContainText("Аналитика");
  await expect(page.getByTestId("NAV-04")).toContainText("Русский");
  expect((await context.cookies()).find((c) => c.name === "sp_locale")?.value).toBe("ru");
  // Qayta yuklansa ham saqlanadi (bo'yashdan oldingi skript).
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByTestId("NAV-03-analytics").first()).toContainText("Аналитика");
});

test("NAV-05: mavzu tugmasi — qorong'i ↔ yorug', aria-label, cookie, qayta yuklashda saqlanadi", async ({ page, context }) => {
  await open(page);
  const btn = page.getByTestId("NAV-05").first();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(btn).toHaveAttribute("aria-label", "Yorug‘ mavzuga o‘tish");
  await btn.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(btn).toHaveAttribute("aria-label", "Qorong‘i mavzuga o‘tish");
  expect((await context.cookies()).find((c) => c.name === "sp_theme")?.value).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Audio nishoni: bugungi past ballilar; tooltip chegara bilan", async ({ page }) => {
  await open(page);
  const badge = page.getByTestId("NAV-03-audio-badge").first();
  await expect(badge).toContainText("41");
  await badge.hover();
  await expect(page.getByRole("tooltip")).toContainText("Bugun 5 dan past ball olgan qo‘ng‘iroqlar");
});

test("Audio nishoni: 0 bo'lsa ko'rinmaydi", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await mockBackend(context, { lowScoreToday: 0 });
  await seedSession(context, baseURL!);
  const page = await context.newPage();
  await open(page);
  await expect(page.getByTestId("NAV-03-audio-badge")).toHaveCount(0);
  await context.close();
});

test("Tarifda yopiq band: qulf, sahifaga o'tmaydi, kod oynasi ochiladi", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await mockBackend(context, { locked: ["reports"] });
  await seedSession(context, baseURL!);
  const page = await context.newPage();
  await open(page);
  const item = page.getByTestId("NAV-03-control").first();
  await expect(item).toHaveAttribute("aria-label", /tarifingizda yopiq/);
  await item.click();
  await expect(page).toHaveURL(/\/dashboard\/upload$/);
  await expect(page.getByPlaceholder(/kod/i).first()).toBeVisible();
  await context.close();
});

test("HDR-BELL: nuqta faqat o'qilmagan bo'lsa; bosilsa tortma URL bilan ochiladi va yopiladi", async ({ page }) => {
  await open(page);
  const bell = page.getByTestId("HDR-BELL");
  await expect(bell).toHaveAttribute("aria-label", "Bildirishnomalar, 0 ta o‘qilmagan");
  await expect(page.getByTestId("HDR-BELL-dot")).toHaveCount(0);
  await bell.click();
  await expect(page).toHaveURL(/notifications=all/);
  const drawer = page.getByTestId("NOTIF-DRAWER");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Hozircha yangi bildirishnoma yo‘q");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page).not.toHaveURL(/notifications=/);
});

test("To'g'ridan-to'g'ri ?notifications=all havolasi tortmani ochadi", async ({ page }) => {
  await page.goto("/dashboard/upload?notifications=all");
  await expect(page.getByTestId("NOTIF-DRAWER")).toBeVisible();
});

test("Sessiyasiz → /login (qobiq ma'lumot so'ramaydi)", async ({ browser }) => {
  const context = await browser.newContext();
  const log: string[] = [];
  await mockBackend(context, { log });
  const page = await context.newPage();
  await page.goto("/dashboard/management");
  await expect(page).toHaveURL(/\/login/);
  expect(log.filter((l) => !l.includes("/health"))).toEqual([]);
  await context.close();
});

test("Noma'lum bo'lim → /dashboard", async ({ page }) => {
  await page.goto("/dashboard/no-such-section");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test.describe("mobil (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("A15: yuqori panel va menyu tortmasi", async ({ page }) => {
    await page.goto("/dashboard/upload");
    await expect(page.getByTestId("NAV")).toBeHidden();
    await page.getByTestId("NAV-00-menu").click();
    const drawer = page.getByTestId("NAV-DRAWER");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("NAV-02")).toContainText("JAMALS INTERNATIONAL");
    await drawer.getByTestId("NAV-03-status").click();
    await expect(page).toHaveURL(/\/dashboard\/analysis-status$/);
    await expect(drawer).toBeHidden();
    // Gorizontal aylantirish yo'q.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("Klaviatura: Segmented strelkalar bilan tanlaydi (Mavzu)", async ({ page }) => {
  await open(page);
  await page.getByTestId("NAV-02").click();
  const dark = page.getByTestId("NAV-02-theme-dark");
  await dark.click();
  await dark.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("NAV-02-theme-light")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

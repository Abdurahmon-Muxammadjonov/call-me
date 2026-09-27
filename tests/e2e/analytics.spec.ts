/* 2-bosqich: Analitika (spetsifikatsiya §6.2). Soat maketdagidek
 * muzlatilgan: payshanba, 24-sentabr 2026, 20:40 (Toshkent). */

import { expect, test, type Page } from "@playwright/test";
import { mockBackend, seedSession } from "../fixtures/backend";
import { FIXED_NOW } from "../fixtures/analytics";

const NB = " ";

async function open(page: Page, path = "/dashboard") {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(path);
  await expect(page.getByTestId("AN-HERO")).toBeVisible();
}

test.beforeEach(async ({ context, baseURL }) => {
  await mockBackend(context, { analytics: true });
  await seedSession(context, baseURL!);
});

test("Sarlavha: sana, soat va davr tanlagichi", async ({ page }) => {
  await open(page);
  await expect(page.locator("h1")).toHaveText("Analitika");
  await expect(page.locator("header .pn-eyebrow").first()).toContainText("payshanba, 24-sentabr · 20:40");
  await expect(page.getByTestId("AN-01-day")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("HDR-BELL")).toBeVisible();
});

test("Hero: jami, o'zgarish, kechaning shu vaqti, soatlik ustunlar va statistika", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("AN-HERO-total")).toHaveText(`1${NB}306`);
  await expect(page.getByTestId("AN-HERO-delta")).toHaveText("↑ 87.4%");
  await expect(page.getByTestId("AN-HERO")).toContainText("kechaning shu vaqtida 697 ta edi");
  await expect(page.getByTestId("AN-HERO")).toContainText("21:17");
  await expect(page.getByTestId("AN-HERO")).toContainText("uzun suhbat (>60 s)");
  await expect(page.getByTestId("AN-HERO-peak")).toContainText("19:00");
  await expect(page.getByTestId("AN-HERO-peak")).toContainText("eng band soat · 171 ta");
  // 09:00–23:00 = 15 ustun; 21–23 kelajak (qiymatsiz).
  const bars = page.locator('[data-testid^="AN-05-bar-"]');
  await expect(bars).toHaveCount(15);
  await expect(page.getByTestId("AN-05-bar-14")).toHaveAttribute("data-value", "");
  await expect(page.getByTestId("AN-05-bar-10")).toHaveAttribute("data-value", "171");
  // AN-05: hover — tooltip.
  await page.getByTestId("AN-05-bar-11").hover();
  await expect(page.getByTestId("AN-05").getByRole("status")).toHaveText("20:00 · 80 ta");
});

test("Pastel plitkalar va konversiya", async ({ page }) => {
  await open(page);
  const leads = page.getByTestId("AN-LEADS");
  await expect(leads).toContainText("Yangi lidlar");
  await expect(leads).toContainText("48");
  await expect(leads).toContainText("+12");
  await expect(leads).toContainText("kecha 36 · takrorlanmaydi");
  const offers = page.getByTestId("AN-OFFERS");
  await expect(offers).toContainText("+3");
  await expect(offers).toContainText("yangi lidlarning 22.9%");
  await expect(page.locator('[data-testid^="AN-07-lilac-bar-"]')).toHaveCount(14);
  // AN-07: mini ustun tooltip'i.
  await page.getByTestId("AN-07-lilac-bar-13").hover();
  await expect(page.getByTestId("AN-07-lilac").getByRole("status")).toHaveText("24-sen · 48 ta");
  const conv = page.getByTestId("AN-CONV");
  await expect(conv).toContainText("14.6%");
  await expect(conv).toContainText("Konversiya · lid → bitim");
  await expect(conv).toContainText("48lid");
  await expect(conv).toContainText("7bitim");
  await expect(page.getByTestId("AN-CONV-foot")).toHaveText("kecha 16.7%");
});

test("AN-09 Dinamika: o'q (niceTicks), 14 ustun, klaviatura bilan tooltip", async ({ page }) => {
  await open(page);
  const card = page.getByTestId("AN-DYN");
  await expect(card).toContainText("Kunlik kesimda · 11–24 sentabr");
  for (const v of ["1400", "1050", "700", "350", "0"]) await expect(card).toContainText(v);
  await expect(page.locator('[data-testid^="AN-09-bar-"]')).toHaveCount(14);
  await expect(page.getByTestId("AN-09-bar-13")).toHaveAttribute("data-value", "1306");
  await page.getByTestId("AN-09").focus();
  await page.keyboard.press("End");
  const tip = page.getByTestId("AN-09").getByRole("status");
  await expect(tip).toContainText("24-sen");
  await expect(tip).toContainText(`Qo‘ng‘iroqlar 1${NB}306`);
  await page.keyboard.press("ArrowLeft");
  await expect(tip).toContainText("23-sen");
});

test("Voronka va chiquvchi/kiruvchi", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("AN-10-calls")).toContainText(`1${NB}306`);
  await expect(page.getByTestId("AN-10-long")).toContainText("23.6%");
  await expect(page.getByTestId("AN-10-leads")).toContainText("15.6%");
  await expect(page.getByTestId("AN-10-offers")).toContainText("22.9%");
  await expect(page.getByTestId("AN-10-deals")).toContainText("63.6%");
  const dir = page.getByTestId("AN-DIR");
  await expect(dir).toContainText(`1${NB}306 jami`);
  await expect(dir).toContainText(`Chiquvchi 1${NB}104`);
  await expect(dir).toContainText("Kiruvchi 202");
});

test("Norma banneri: AN-03 va AN-04 jadvalga olib boradi", async ({ page }) => {
  await open(page);
  const banner = page.getByTestId("AN-BANNER");
  await expect(banner).toContainText("10 ta operator");
  await expect(banner).toContainText("kunlik normadan orqada · norma: 60 soniyadan uzun 40 ta qo‘ng‘iroq");
  await expect(page.getByTestId("AN-04-5200")).toContainText("6/40");
  await expect(page.getByTestId("AN-04-110")).toContainText("12/40");
  await expect(page.getByTestId("AN-04-109")).toContainText("14/40");
  await page.getByTestId("AN-04-5200").click();
  await expect(page).toHaveURL(/team=behind/);
  const row = page.getByTestId("AN-14-5200");
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-selected", "true");
  await page.goto("/dashboard");
  await page.getByTestId("AN-03").click();
  await expect(page).toHaveURL(/team=behind/);
  await expect(page.getByTestId("AN-11-behind")).toHaveAttribute("aria-checked", "true");
});

test("Jamoa: filtr, saralash, 'Yana N ta', qator va havola", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("AN-11-all")).toHaveText("Hammasi · 12");
  await expect(page.getByTestId("AN-11-behind")).toHaveText("Orqada · 10");
  await expect(page.getByTestId("AN-11-ok")).toHaveText("Normada · 2");
  const rows = page.locator('[data-testid^="AN-14-"]');
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText("Operator 102");
  await expect(rows.first()).toContainText("Normada");
  await page.getByTestId("AN-15").click();
  await expect(rows).toHaveCount(12);
  await expect(page.getByTestId("AN-15")).toHaveText("Kamroq ko‘rsatish");

  await page.getByTestId("AN-11-ok").click();
  await expect(page).toHaveURL(/team=ok/);
  await expect(rows).toHaveCount(2);

  await page.getByTestId("AN-11-all").click();
  await page.getByRole("columnheader", { name: "Qo‘ng‘iroq" }).getByRole("button").click();
  await expect(page).toHaveURL(/teamSort=calls\.desc/);
  await expect(rows.first()).toContainText("Operator 104");
  await expect(page.getByRole("columnheader", { name: "Qo‘ng‘iroq" })).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("columnheader", { name: "Qo‘ng‘iroq" }).getByRole("button").click();
  await expect(page).toHaveURL(/teamSort=calls\.asc/);
  await expect(rows.first()).toContainText("Operator 5200");

  await page.getByTestId("AN-12").click();
  await expect(page).toHaveURL(/\/dashboard\/staff-stats$/);
});

test("AN-14: qator bosilsa — operatorning bugungi audio yozuvlari", async ({ page }) => {
  await open(page);
  await page.getByTestId("AN-14-102").click();
  await expect(page).toHaveURL(/\/dashboard\/recordings\?operator=102&date=2026-09-24$/);
});

test("AN-01: Hafta va Oy — URL, sarlavha, Dinamika; jamoa uchun AN-16", async ({ page }) => {
  await open(page);
  await page.getByTestId("AN-01-week").click();
  await expect(page).toHaveURL(/period=week/);
  await expect(page.getByTestId("AN-HERO")).toContainText("Shu haftadagi qo‘ng‘iroqlar");
  await expect(page.locator("header .pn-eyebrow").first()).toContainText("Shu hafta · 21–27-sentabr");
  await expect(page.getByTestId("AN-DYN")).toContainText("Haftalik kesimda · so‘nggi 12 hafta");
  await expect(page.locator('[data-testid^="AN-05-bar-"]')).toHaveCount(7);
  await expect(page.getByTestId("AN-BANNER")).toHaveCount(0);
  await page.getByTestId("AN-16").click();
  await expect(page).not.toHaveURL(/period=/);
  await expect(page.getByTestId("AN-HERO")).toContainText("Bugungi qo‘ng‘iroqlar");
  await page.getByTestId("AN-01-month").click();
  await expect(page.getByTestId("AN-DYN")).toContainText("Oylik kesimda · so‘nggi 12 oy");
  await expect(page.locator('[data-testid^="AN-05-bar-"]')).toHaveCount(30);
  // Klaviatura: strelka bilan davr.
  await page.getByTestId("AN-01-month").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/period=week/);
});

test("Xato holati va qayta urinish", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await mockBackend(context, { analytics: true, analyticsError: true });
  await seedSession(context, baseURL!);
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/dashboard");
  await expect(page.getByTestId("AN-ERROR")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("AN-RETRY")).toBeVisible();
  await context.close();
});

test("Rus tili", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await mockBackend(context, { analytics: true });
  await seedSession(context, baseURL!, { locale: "ru" });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/dashboard");
  await expect(page.locator("h1")).toHaveText("Аналитика");
  await expect(page.getByTestId("AN-HERO")).toContainText("Звонки сегодня");
  await expect(page.getByTestId("AN-HERO")).toContainText("вчера к этому времени было 697");
  await expect(page.locator("header .pn-eyebrow").first()).toContainText("четверг, 24 сентября · 20:40");
  await context.close();
});

test.describe("mobil (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("gorizontal aylantirish yo'q, jadval o'z ichida aylanadi", async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByTestId("AN-14-102")).toBeAttached();
  });
});

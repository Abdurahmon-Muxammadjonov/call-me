/* 3-bosqich: Solishtirish (03-Solishtirish.png). Soat: 24-sentabr 20:40. */

import { expect, test, type Page } from "@playwright/test";
import { mockBackend, seedSession } from "../fixtures/backend";
import { FIXED_NOW } from "../fixtures/analytics";

const NB = " ";

async function open(page: Page, path = "/dashboard/comparison") {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(path);
  await expect(page.getByTestId("CMP-M-calls")).toBeVisible();
}

test.beforeEach(async ({ context, baseURL }) => {
  await mockBackend(context, { analytics: true });
  await seedSession(context, baseURL!);
});

test("Sarlavha: A/B tanlagichlar va davr", async ({ page }) => {
  await open(page);
  await expect(page.locator("h1")).toHaveText("Solishtirish");
  await expect(page.getByTestId("CMP-01")).toContainText("Kecha, 23-sen");
  await expect(page.getByTestId("CMP-02")).toContainText("Bugun, 24-sen");
  await expect(page.getByTestId("CMP-03-day")).toHaveAttribute("aria-checked", "true");
});

test("Metrika kartalari: shu vaqtgacha solishtirish, o'zgarish va shkala", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("CMP-M-calls-b")).toHaveText(`1${NB}306`);
  await expect(page.getByTestId("CMP-M-calls-a")).toHaveText("697");
  await expect(page.getByTestId("CMP-M-calls-delta")).toHaveText("↑87.4%");
  await expect(page.getByTestId("CMP-M-calls")).toContainText(`1${NB}400`);
  await expect(page.getByTestId("CMP-M-talk-b")).toHaveText(`1${NB}277`);
  await expect(page.getByTestId("CMP-M-talk-delta")).toHaveText("↑82.7%");
  await expect(page.getByTestId("CMP-M-score-b")).toHaveText("3.4");
  await expect(page.getByTestId("CMP-M-score-a")).toHaveText("3.5");
  await expect(page.getByTestId("CMP-M-score-delta")).toHaveText("↓2.9%");
});

test("CMP-04 grafik: cho'qqida turgan tooltip (D10), hozir chizig'i (D15), klaviatura", async ({ page }) => {
  await open(page);
  const card = page.getByTestId("CMP-CHART");
  await expect(card).toContainText("Soatlar bo‘yicha");
  await expect(card).toContainText("Ikkala tomonda ham cho‘qqi 19:00 da");
  for (const v of ["180", "120", "60"]) await expect(card).toContainText(v);
  const tip = page.getByTestId("CMP-04-tip");
  await expect(tip).toContainText("19:00 – 20:00");
  await expect(tip).toContainText("171");
  await expect(tip).toContainText("86");
  await expect(tip).toContainText("+98.8%");
  // "Hozir" chizig'i 20:00 birligida (09 dan 11-chi).
  await expect(page.getByTestId("CMP-04-now")).toBeAttached();
  await page.getByTestId("CMP-04").focus();
  await page.keyboard.press("Home");
  await expect(tip).toContainText("09:00 – 10:00");
  await page.keyboard.press("ArrowRight");
  await expect(tip).toContainText("10:00 – 11:00");
});

test("Kim o'sdi, kim tushdi: saralangan, divMax shkala", async ({ page }) => {
  await open(page);
  const rows = page.locator('[data-testid^="CMP-MV-"]');
  await expect(rows).toHaveCount(12);
  await expect(rows.first()).toContainText("103");
  await expect(rows.first()).toContainText("3.6 → 3.9");
  await expect(rows.last()).toContainText("100");
  await expect(rows.last()).toContainText("2.9 → 2.3");
});

test("Kunlik gaplashuv: bugun ochiq, boshqasini ochish (URL open=), operatorlar", async ({ page }) => {
  await open(page);
  const today = page.getByTestId("CMP-05-2026-09-24");
  await expect(today).toHaveAttribute("aria-expanded", "true");
  await expect(today).toContainText("21:17");
  await expect(page.getByTestId("CMP-05-2026-09-24-panel")).toContainText("3:24");
  await page.getByTestId("CMP-05-2026-09-23").click();
  await expect(page).toHaveURL(/open=2026-09-23/);
  await expect(page.getByTestId("CMP-05-2026-09-23")).toHaveAttribute("aria-expanded", "true");
  await expect(today).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("CMP-05-2026-09-23").click();
  await expect(page).toHaveURL(/open=none/);
  await expect(page.locator('[data-testid^="CMP-05-"][aria-expanded="true"]')).toHaveCount(0);
  await page.getByTestId("CMP-06").click();
  await expect(page.locator('button[data-testid^="CMP-05-"]')).toHaveCount(14);
});

test("CMP-01 sana tanlagich: boshqa kun tanlanadi, klaviatura bilan ham", async ({ page }) => {
  await open(page);
  await page.getByTestId("CMP-01").click();
  const picker = page.getByTestId("CMP-01-picker");
  await expect(picker).toBeVisible();
  await expect(page.getByTestId("dp-2026-09-25")).toHaveAttribute("aria-disabled", "true");
  await page.getByTestId("dp-2026-09-20").click();
  await expect(page).toHaveURL(/a=2026-09-20/);
  await expect(page.getByTestId("CMP-01")).toContainText("20-sen");
  await expect(picker).toBeHidden();
  // Klaviatura: ochish, chapga, Enter.
  await page.getByTestId("CMP-01").click();
  await expect(page.getByTestId("dp-2026-09-20")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/a=2026-09-19/);
});

test("CMP-03 Hafta va Oy: tanlagich rejimi, operatorlar uchun CMP-07", async ({ page }) => {
  await open(page);
  await page.getByTestId("CMP-03-week").click();
  await expect(page).toHaveURL(/period=week/);
  await expect(page.getByTestId("CMP-02")).toContainText("Shu hafta");
  await expect(page.getByTestId("CMP-01")).toContainText("O‘tgan hafta");
  await expect(page.getByTestId("CMP-CHART")).toContainText("Kunlar bo‘yicha");
  await page.getByTestId("CMP-01").click();
  await page.getByTestId("dp-2026-09-10").hover();
  await page.getByTestId("dp-2026-09-10").click();
  await expect(page).toHaveURL(/a=2026-09-07/);
  await page.getByTestId("CMP-03-month").click();
  await expect(page.getByTestId("CMP-02")).toContainText("Shu oy");
  await page.getByTestId("CMP-02").click();
  await expect(page.getByTestId("dp-2026-10")).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page.getByTestId("CMP-07").click();
  await expect(page).not.toHaveURL(/period=/);
});

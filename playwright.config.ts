import { defineConfig, devices } from "@playwright/test";

/* E2E (spetsifikatsiya §13): ishlab chiqarish build'i (`npm run build`)
 * ustida `next start`. Backend HECH QACHON chaqirilmaydi — har bir test
 * API so'rovlarini tests/fixtures/backend.ts dagi soxta javoblar bilan
 * to'liq ushlaydi (noma'lum yo'l ham tashqariga chiqmaydi). */
const PORT = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

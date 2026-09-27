import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tashkentToday, hmOf, addDays, dayDiff, isoWeekday, weekStart, sameDayPrevMonth, shiftMonth,
  weekdayName, weekdayShort, dayMonth, dayMonthShort, rangeLabel, monthYear, hoursMinutes, monthName,
} from "./dates.ts";

test("Toshkent kuni va vaqti UTC+5", () => {
  const d = new Date("2026-09-24T19:30:00Z"); // Toshkentda 25-sentabr 00:30
  assert.equal(tashkentToday(d), "2026-09-25");
  assert.equal(hmOf(new Date("2026-09-24T15:40:00Z")), "20:40");
});

test("kun arifmetikasi", () => {
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(dayDiff("2026-09-11", "2026-09-24"), 13);
  assert.equal(isoWeekday("2026-09-24"), 3); // payshanba
  assert.equal(weekStart("2026-09-24"), "2026-09-21");
  assert.equal(sameDayPrevMonth("2026-03-31"), "2026-02-28");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-11", 3), "2027-02");
});

test("nomlar: o'zbekcha jadval, rus/ingliz Intl", () => {
  assert.equal(weekdayName("uz", "2026-09-24"), "payshanba");
  assert.equal(dayMonth("uz", "2026-09-24"), "24-sentabr");
  assert.equal(dayMonthShort("uz", "2026-09-15"), "15-sen");
  assert.equal(weekdayShort("uz", 0), "Du");
  assert.equal(weekdayShort("uz", 6), "Ya");
  assert.equal(monthYear("uz", "2026-09-24"), "sentabr 2026");
  assert.equal(monthName("ru", 9), "сентябрь");
  assert.equal(dayMonth("ru", "2026-09-24"), "24 сентября");
});

test("oraliq yorlig'i (Dinamika / eyebrow)", () => {
  assert.equal(rangeLabel("uz", "2026-09-11", "2026-09-24"), "11–24 sentabr");
  assert.equal(rangeLabel("uz", "2026-09-21", "2026-09-27", true), "21–27-sentabr");
  assert.equal(rangeLabel("uz", "2026-08-29", "2026-09-11"), "29-avgust – 11-sentabr");
  assert.equal(rangeLabel("ru", "2026-09-11", "2026-09-24"), "11–24 сентября");
});

test("soat:daqiqa gaplashuv (maket: 21:17)", () => {
  assert.equal(hoursMinutes(21 * 3600 + 17 * 60), "21:17");
  assert.equal(hoursMinutes(59), "0:01");
  assert.equal(hoursMinutes(0), "0:00");
});

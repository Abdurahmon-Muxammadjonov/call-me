// Xato -> skriptdagi yechim (2026-10-15).
import test from "node:test";
import assert from "node:assert/strict";
import { solutionFor, stageCore } from "./solutions.ts";

const criteria = [
  { title: "1. Salomlashish va POVOD (qo'ng'iroq sababi)", description: "Salomlashdi, ismi bilan murojaat qildi va vaqt so'radi.", category: "Skript: Eski baza" },
  { title: "1. Salomlashish va tasdiqlash", description: "Salomlashdi va akademiya nomini aytdi.", category: "Skript: Yangi lid" },
  { title: "9. E'tirozlar bilan ishlash", description: "FORMULA: avval qo'shildi, keyin argument.", category: "Skript: Eski baza" },
  { title: "8. E'tirozlar bilan ishlash", description: "Yangi lid uchun: qo'shilish -> argument -> kichik qadam.", category: "Skript: Yangi lid" },
];

test("stageCore — raqam, qavs va tinish belgilari olib tashlanadi", () => {
  assert.equal(stageCore("1. Salomlashish va POVOD (qo'ng'iroq sababi)"), "salomlashish va povod");
  assert.equal(stageCore("E’tirozlar bilan ishlash"), "e'tirozlar bilan ishlash");
});

test("bosqich nomi bo'yicha aniq moslik", () => {
  const fix = solutionFor("Salomlashish va POVOD: operator o'zini tanishtirmadi", false, criteria);
  assert.equal(fix, "Salomlashdi, ismi bilan murojaat qildi va vaqt so'radi.");
});

test("bir xil nomli bosqich — qo'ng'iroq turiga mos skript tanlanadi", () => {
  assert.match(solutionFor("E'tirozlar bilan ishlash: to'liq bajarilmadi", true, criteria)!, /Yangi lid uchun/);
  assert.match(solutionFor("E'tirozlar bilan ishlash: to'liq bajarilmadi", false, criteria)!, /FORMULA/);
});

test("mos bosqich yo'q — null", () => {
  assert.equal(solutionFor("Narx: aytilmadi", false, criteria), null);
  assert.equal(solutionFor("", false, criteria), null);
});

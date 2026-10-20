// Dashboard sozlamasi (2026-10-16).
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, moveSection, normalizeLayout, toggleSection } from "./dashLayout.ts";

test("noto'g'ri yoki eski sozlama standartga to'ldiriladi", () => {
  assert.deepEqual(normalizeLayout(null), DEFAULT_LAYOUT);
  const l = normalizeLayout({ order: ["team", "xyz", "team"], hidden: ["tiles", "abc"] });
  assert.deepEqual(l.order, ["team", "tiles", "dynamics", "leadQuality", "crmMoney"]);
  assert.deepEqual(l.hidden, ["tiles"]);
});

test("yuqoriga/pastga surish va chegaralar", () => {
  const l = moveSection(DEFAULT_LAYOUT, "team", -1);
  assert.deepEqual(l.order, ["tiles", "dynamics", "team", "leadQuality", "crmMoney"]);
  assert.equal(moveSection(DEFAULT_LAYOUT, "tiles", -1), DEFAULT_LAYOUT);
});

test("yashirish va qaytarish", () => {
  const h = toggleSection(DEFAULT_LAYOUT, "leadQuality");
  assert.deepEqual(h.hidden, ["leadQuality"]);
  assert.deepEqual(toggleSection(h, "leadQuality").hidden, []);
});

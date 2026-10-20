// Sotuv dashboardi joylashuvi (2026-10-20).
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SALES_LAYOUT, cycleSpan, moveWidget, normalizeSalesLayout, spanOf, toggleWidget } from "./salesLayout.ts";

test("eski/noto'g'ri sozlama standartga to'ldiriladi", () => {
  assert.deepEqual(normalizeSalesLayout(null), DEFAULT_SALES_LAYOUT);
  const l = normalizeSalesLayout({ order: ["managers", "xyz", "managers"], hidden: ["ai", "abc"], span: { debt: 12, kpis: 5 } });
  assert.equal(l.order[0], "managers");
  assert.equal(l.order.length, DEFAULT_SALES_LAYOUT.order.length);
  assert.deepEqual(l.hidden, ["ai"]);
  assert.deepEqual(l.span, { debt: 12 });
});

test("surish, yashirish, kenglik", () => {
  assert.equal(moveWidget(DEFAULT_SALES_LAYOUT, "kpis", -1), DEFAULT_SALES_LAYOUT);
  assert.equal(moveWidget(DEFAULT_SALES_LAYOUT, "planFact", -1).order[0], "planFact");
  assert.deepEqual(toggleWidget(DEFAULT_SALES_LAYOUT, "ai").hidden, ["ai"]);
  assert.equal(spanOf(DEFAULT_SALES_LAYOUT, "debt"), 6);
  assert.equal(spanOf(cycleSpan(DEFAULT_SALES_LAYOUT, "debt"), "debt"), 8);
  assert.equal(spanOf(cycleSpan(DEFAULT_SALES_LAYOUT, "kpis"), "kpis"), 4);
});

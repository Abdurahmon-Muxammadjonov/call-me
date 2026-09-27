import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreTone, isLowScore, pctTone, coverageTone, indexTone, conversionTone, funnelStepTone, deltaTone, goodDirection,
} from "./tones.ts";
import { accentInk, accentVars, ACCENT_KEYS, parseHex } from "./accent.ts";

test("scoreTone: 4 yorliq, 3 rang; T /me dan keladi", () => {
  assert.deepEqual(scoreTone(8.2, 8), { tone: "good", label: "excellent" });
  assert.deepEqual(scoreTone(7, 8), { tone: "warn", label: "good" });
  assert.deepEqual(scoreTone(6.5, 8), { tone: "warn", label: "good" });
  assert.deepEqual(scoreTone(5, 8), { tone: "warn", label: "average" });
  assert.deepEqual(scoreTone(4.9, 8), { tone: "bad", label: "low" });
  assert.deepEqual(scoreTone(null, 8), { tone: "neutral", label: "none" });
  // Maqsad noma'lum — "A‘lo" bandi qo'llanmaydi, hech narsa o'ylab topilmaydi.
  assert.deepEqual(scoreTone(9.5, null), { tone: "warn", label: "good" });
});

test("isLowScore: faqat /me chegarasi bilan", () => {
  assert.equal(isLowScore(4.9, 5), true);
  assert.equal(isLowScore(5, 5), false);
  assert.equal(isLowScore(3, null), false);
  assert.equal(isLowScore(null, 5), false);
});

test("pct / coverage / index / funnel tonlari", () => {
  assert.equal(pctTone(80), "good");
  assert.equal(pctTone(50), "warn");
  assert.equal(pctTone(49.9), "bad");
  assert.equal(coverageTone(25), "good");
  assert.equal(coverageTone(24.9), "warn");
  assert.deepEqual(indexTone(80), { tone: "good", label: "excellent" });
  assert.deepEqual(indexTone(50), { tone: "warn", label: "average" });
  assert.deepEqual(indexTone(10), { tone: "bad", label: "low" });
  assert.equal(funnelStepTone(59.9), "bad");
  assert.equal(funnelStepTone(60), "good");
});

test("conversionTone: maqsad va 0.7 × maqsad", () => {
  assert.equal(conversionTone(20, 20), "good");
  assert.equal(conversionTone(14.6, 20), "warn");
  assert.equal(conversionTone(13.9, 20), "bad");
  assert.equal(conversionTone(5, null), "neutral");
});

test("deltaTone: ko'rsatkich yo'nalishi bo'yicha", () => {
  assert.equal(deltaTone(12, goodDirection("calls")), "good");
  assert.equal(deltaTone(-3, goodDirection("calls")), "bad");
  assert.equal(deltaTone(-3, goodDirection("penalty")), "good");
  assert.equal(deltaTone(2, goodDirection("lowScore")), "bad");
  assert.equal(deltaTone(0, "up"), "neutral");
  assert.equal(deltaTone(null, "up"), "neutral");
});

test("accentVars: to'rtala preset siyohi #101114 (§4.3)", () => {
  for (const k of ACCENT_KEYS) {
    assert.equal(accentVars(k)["--pn-accent-ink"], "#101114");
  }
  assert.equal(accentInk("#101114"), "#FFFFFF");
  assert.deepEqual(parseHex("zz"), [212, 245, 112]);
  assert.equal(accentVars("lime")["--pn-accent-soft"], "rgba(212, 245, 112, 0.14)");
  assert.equal(accentVars("blue")["--pn-accent-strong-light"], "#2F5FD0");
  assert.equal(accentVars("violet")["--pn-on-accent-muted"], "rgba(16, 17, 20, 0.68)");
});

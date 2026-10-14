// Operatorlar doim ko'rinadi (2026-10-15): qo'ng'iroqsiz kunda ham doimiy
// ro'yxatdagi har bir operator nol ko'rsatkich bilan turadi.
import test from "node:test";
import assert from "node:assert/strict";
import { extFromName, withRosterOps, withRosterStaff } from "./roster.model.ts";
import type { OperatorDay } from "./dayCalls.ts";
import type { StaffRow } from "./staff.ts";

const managers = [
  { id: "m105", name: "Operator 105" },
  { id: "m100", name: "Operator 100" },
  { id: "m-ali", name: "Ali Valiyev" },
];

const op = (p: Partial<OperatorDay>): OperatorDay => ({
  key: "x", ext: null, name: null, calls: 0, longCalls: 0, incoming: 0, outgoing: 0,
  leads: null, score10: null, scored: 0, talkSec: 0, ...p,
});

test("extFromName — ism oxiridagi raqam", () => {
  assert.equal(extFromName("Operator 105"), "105");
  assert.equal(extFromName("Operator 5200 "), "5200");
  assert.equal(extFromName("Ali Valiyev"), null);
});

test("qo'ng'iroqsiz kun: hamma operator nol bilan turadi", () => {
  const rows = withRosterOps([], managers);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.calls === 0 && r.score10 === null));
  assert.deepEqual(rows.map((r) => r.ext), ["100", "105", null]);
});

test("qo'ng'iroq qilgan operator takrorlanmaydi; ro'yxatda yo'q raqam ham qoladi", () => {
  const rows = withRosterOps(
    [op({ key: "105", ext: "105", name: "Operator 105", calls: 12 }), op({ key: "777", ext: "777", calls: 3 })],
    managers,
  );
  assert.equal(rows.length, 4); // 105, 777, 100, Ali
  assert.equal(rows.filter((r) => r.ext === "105").length, 1);
  assert.deepEqual(rows.slice(0, 2).map((r) => r.ext), ["105", "777"]); // qo'ng'iroq qilganlar birinchi
});

test("ism bo'yicha moslash (raqamsiz operator)", () => {
  const rows = withRosterOps([op({ key: "m-ali", name: "Ali Valiyev", calls: 2 })], managers);
  assert.equal(rows.filter((r) => r.name === "Ali Valiyev").length, 1);
});

test("menejerlar ro'yxati hali yuklanmagan — qatorlar o'zgarmaydi", () => {
  const base = [op({ key: "105", ext: "105", calls: 1 })];
  assert.deepEqual(withRosterOps(base, undefined), base);
});

test("xodimlar statistikasi: yo'q operatorlar nol qator bilan, kaliti ext:NNN", () => {
  const present = { key: "ext:105", name: "Operator 105", calls: 5 } as StaffRow;
  const rows = withRosterStaff([present], managers);
  assert.equal(rows.length, 3);
  const zero = rows.find((r) => r.key === "ext:100")!;
  assert.equal(zero.calls, 0);
  assert.equal(zero.scored_calls, 0);
  assert.deepEqual(zero.stages, []);
  assert.equal(rows.find((r) => r.name === "Ali Valiyev")!.key, "m:m-ali");
});

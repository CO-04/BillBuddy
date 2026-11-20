/*
  BillBuddy core tests (development only — NOT a runtime dependency).

  These tests load the <script id="billbuddy-core"> element straight out
  of ../index.html and execute it, so they exercise the exact same
  implementation the page uses. No frameworks: Node's built-in test
  runner and assert module only.

  Run with:  node --test tests
*/
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// ---- Load the page's own core script ----
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const match = html.match(/<script id="billbuddy-core">([\s\S]*?)<\/script>/);
assert.ok(match, "index.html must contain <script id=\"billbuddy-core\">");
// Run in the host realm so arrays/objects share prototypes with the tests.
vm.runInThisContext(match[1], { filename: "index.html#billbuddy-core" });
const core = globalThis.BillBuddyCore;
assert.ok(core, "core script must define globalThis.BillBuddyCore");

// Helper: run a full validated auto calculation.
function calc(bill, people, minFee, maxFee, incrementCents) {
  const v = core.validateCalculationInput({
    bill, people, minFee, maxFee, incrementCents, mode: "auto"
  });
  assert.ok(v.ok, "expected valid input, got " + JSON.stringify(v.errors));
  return core.optimise(v.values);
}

// ---------------------------------------------------------------
test("README example: R1,500 / 5 people / 10-12% / R5 is an exact match", () => {
  const { recommended } = calc("1500", "5", "10", "12", 500);
  assert.equal(recommended.feeBp, 1000);           // 10%
  assert.equal(recommended.feeCents, 15000);       // R150.00
  assert.equal(recommended.totalCents, 165000);    // R1,650.00
  assert.equal(recommended.exact, true);
  assert.equal(recommended.targetPerPersonCents, 33000); // R330.00
  assert.deepEqual(recommended.shares, [33000, 33000, 33000, 33000, 33000]);
});

test("range with no exact match is honestly labelled a near match", () => {
  // R100 among 3 people, R10 increment: totals 11000-11200 cents,
  // nearest multiples of 3*1000=3000 are 9000/12000 — never exact.
  const { recommended, alternatives } = calc("100", "3", "10", "12", 1000);
  assert.equal(recommended.exact, false);
  assert.ok(recommended.distanceTotalCents > 0);
  for (const alt of alternatives) assert.equal(alt.exact, false);
});

test("decimal fee percentages parse to exact basis points", () => {
  assert.deepEqual(core.parsePercent("10.25"), { ok: true, bp: 1025 });
  assert.deepEqual(core.parsePercent("10.2"), { ok: true, bp: 1020 });
  assert.deepEqual(core.parsePercent("0"), { ok: true, bp: 0 });
  assert.deepEqual(core.parsePercent("30"), { ok: true, bp: 3000 });
  assert.deepEqual(core.parsePercent("30.00"), { ok: true, bp: 3000 });
  assert.equal(core.parsePercent("30.01").ok, false); // above cap
  assert.equal(core.parsePercent("10.255").ok, false); // 3 decimals
});

test("search range boundaries are inclusive", () => {
  // min == max: only that single basis point may be used.
  const { recommended, alternatives } = calc("1000", "2", "12", "12", 100);
  assert.equal(recommended.feeBp, 1200);
  assert.equal(alternatives.length, 0); // one bp -> one total -> no alternatives
});

test("every result stays inside the configured fee range", () => {
  const { recommended, alternatives } = calc("873.45", "7", "10", "12", 500);
  for (const c of [recommended, ...alternatives]) {
    assert.ok(c.feeBp >= 1000 && c.feeBp <= 1200,
      "fee " + c.feeBp + "bp escaped the 1000-1200 range");
  }
});

test("ranking: exact beats distance, distance beats band, band beats lower fee", () => {
  const mk = (over) => Object.assign({
    exact: false, distanceTotalCents: 50, inPreferredBand: false, feeBp: 1500
  }, over);
  // exact first
  assert.ok(core.compareCandidates(
    mk({ exact: true, distanceTotalCents: 0 }), mk({})) < 0);
  // then smaller distance, even against an in-band candidate
  assert.ok(core.compareCandidates(
    mk({ distanceTotalCents: 10 }),
    mk({ distanceTotalCents: 20, inPreferredBand: true })) < 0);
  // then preferred band, even against a lower fee
  assert.ok(core.compareCandidates(
    mk({ inPreferredBand: true, feeBp: 1150 }), mk({ feeBp: 900 })) < 0);
  // then lower fee
  assert.ok(core.compareCandidates(mk({ feeBp: 1000 }), mk({ feeBp: 1100 })) < 0);
});

test("same-total candidates collapse to the lowest fee representative", () => {
  // R1 bill, 1 person, R1 increment, 0-30%: bps 0-49 all give fee 0
  // (total R1.00, exact). The representative must be the lowest bp: 0.
  const { recommended, alternatives } = calc("1", "1", "0", "30", 100);
  assert.equal(recommended.exact, true);
  assert.equal(recommended.feeBp, 0);
  // alternatives must all have distinct totals
  const totals = [recommended, ...alternatives].map((c) => c.totalCents);
  assert.equal(new Set(totals).size, totals.length);
  assert.ok(alternatives.length <= core.MAX_ALTERNATIVES);
});

test("smallest and largest supported bills calculate safely", () => {
  const small = calc("0.01", "1", "0", "30", 100);
  assert.ok(small.recommended.totalCents >= 1);
  const large = calc("10000", "10", "30", "30", 1000);
  assert.equal(large.recommended.feeCents, 300000);      // R3,000.00
  assert.equal(large.recommended.totalCents, 1300000);   // R13,000.00
  assert.ok(Number.isSafeInteger(large.recommended.totalCents));
});

test("invalid values are rejected, never clamped", () => {
  // money
  assert.equal(core.parseMoney("").ok, false);
  assert.equal(core.parseMoney("-5").ok, false);
  assert.equal(core.parseMoney("1.005").ok, false);
  assert.equal(core.parseMoney("abc").ok, false);
  assert.equal(core.parseMoney("1e3").ok, false);
  assert.equal(core.parseMoney("0").ok, false);
  assert.equal(core.parseMoney("10000.01").ok, false);   // over R10,000
  assert.equal(core.parseMoney("99999999999999999999").ok, false);
  assert.deepEqual(core.parseMoney("10000.00"), { ok: true, cents: 1000000 });
  assert.deepEqual(core.parseMoney("R1,500.50"), { ok: true, cents: 150050 });
  // people
  assert.equal(core.parsePeople("0").ok, false);
  assert.equal(core.parsePeople("11").ok, false);
  assert.equal(core.parsePeople("2.5").ok, false);
  assert.equal(core.parsePeople("-3").ok, false);
  assert.deepEqual(core.parsePeople("10"), { ok: true, people: 10 });
  // percent
  assert.equal(core.parsePercent("-1").ok, false);
  assert.equal(core.parsePercent("abc").ok, false);
  // cross-field rules
  const v1 = core.validateCalculationInput({
    bill: "100", people: "2", minFee: "12", maxFee: "10",
    incrementCents: 500, mode: "auto"
  });
  assert.equal(v1.ok, false);
  assert.ok(v1.errors.minFee.includes("exceed"));
  const v2 = core.validateCalculationInput({
    bill: "100", people: "2", minFee: "10", maxFee: "12",
    incrementCents: 300, mode: "auto"
  });
  assert.equal(v2.ok, false);
  assert.ok(v2.errors.increment);
  const v3 = core.validateCalculationInput({
    bill: "100", people: "2", minFee: "10", maxFee: "12",
    incrementCents: 500, mode: "manual", manualFee: "15"
  });
  assert.equal(v3.ok, false);
  assert.ok(v3.errors.manualFee.includes("between"));
});

test("service fee rounds half-up exactly once", () => {
  assert.equal(core.serviceFeeCents(5, 1000), 1);     // 0.5c  -> 1c
  assert.equal(core.serviceFeeCents(15, 1000), 2);    // 1.5c  -> 2c
  assert.equal(core.serviceFeeCents(14, 1000), 1);    // 1.4c  -> 1c
  assert.equal(core.serviceFeeCents(149, 1000), 15);  // 14.9c -> 15c
  assert.equal(core.serviceFeeCents(150000, 1000), 15000); // R150 exactly
});

test("fractional-cent equal shares are never labelled exact", () => {
  // R1,001.00 among 3: average 333.666..., shares differ by a cent.
  const v = core.validateCalculationInput({
    bill: "1001", people: "3", minFee: "0", maxFee: "0",
    incrementCents: 100, mode: "manual", manualFee: "0"
  });
  assert.ok(v.ok);
  const result = core.manualCalculation(v.values);
  assert.equal(result.exact, false);
  assert.deepEqual(result.shares, [33367, 33367, 33366]); // the spec example
  assert.equal(result.shares.reduce((a, b) => a + b, 0), 100100);
  assert.equal(result.manual, true);
});

test("exactness requires divisibility by people x increment", () => {
  // Total R33.00 for 2 people with R2 increment: average R16.50 looks
  // round-ish but each share cannot be a multiple of R2 -> not exact.
  const info = core.nearestTargetInfo(3300, 2, 200);
  assert.equal(info.exact, false);
  // ...while R32.00 (2 x R16.00) is exact.
  assert.equal(core.nearestTargetInfo(3200, 2, 200).exact, true);
});

test("nearest-target ties deterministically round to the higher target", () => {
  // total 100 is exactly halfway between targets 0 and 200.
  const info = core.nearestTargetInfo(100, 2, 100);
  assert.equal(info.targetTotalCents, 200);
  assert.equal(info.distanceTotalCents, 100);
});

test("all four increments work: R1, R2, R5 and R10", () => {
  for (const inc of [100, 200, 500, 1000]) {
    const { recommended } = calc("1500", "5", "10", "12", inc);
    assert.equal(recommended.targetPerPersonCents % inc, 0);
    assert.equal(recommended.exact, true); // R330 is a multiple of all four
    assert.equal(recommended.shares.reduce((a, b) => a + b, 0),
      recommended.totalCents);
  }
});

test("splits distribute remainder cents and always sum to the total", () => {
  assert.deepEqual(core.splitCents(100100, 3), [33367, 33367, 33366]);
  assert.deepEqual(core.splitCents(100, 3), [34, 33, 33]);
  assert.deepEqual(core.splitCents(7, 10), [1, 1, 1, 1, 1, 1, 1, 0, 0, 0]);
  for (const [total, people] of [[999999, 7], [1, 1], [1000000, 10]]) {
    const shares = core.splitCents(total, people);
    assert.equal(shares.reduce((a, b) => a + b, 0), total);
    assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
  }
});

test("manual mode reuses the same functions and is flagged manual", () => {
  const v = core.validateCalculationInput({
    bill: "1500", people: "5", minFee: "10", maxFee: "12",
    incrementCents: 500, mode: "manual", manualFee: "11"
  });
  assert.ok(v.ok);
  const manual = core.manualCalculation(v.values);
  const auto = core.buildCandidate(150000, 5, 500, 1100);
  assert.equal(manual.manual, true);
  assert.equal(manual.feeCents, auto.feeCents);
  assert.equal(manual.totalCents, auto.totalCents);
  assert.deepEqual(manual.shares, auto.shares);
});

test("formatting helpers render cents and basis points faithfully", () => {
  assert.equal(core.formatRand(165000), "R1,650.00");
  assert.equal(core.formatRand(1), "R0.01");
  assert.equal(core.formatRand(1300000), "R13,000.00");
  assert.equal(core.formatPercentBp(1000), "10%");
  assert.equal(core.formatPercentBp(1050), "10.5%");
  assert.equal(core.formatPercentBp(1025), "10.25%");
});

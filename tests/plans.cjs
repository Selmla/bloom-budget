const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = {};
function load(filename) {
  const file = path.resolve(filename);
  if (cache[file]) return cache[file].exports;
  const mod = (cache[file] = { exports: {} });
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "exports", "module", code)(
    (name) => load(path.join(path.dirname(file), name + ".ts")),
    mod.exports,
    mod,
  );
  return mod.exports;
}
const { DEFAULT_STATE } = load("lib/types.ts");
const { ensurePlans, readPlan, changePlan } = load("lib/plans.ts");
const { rollPeriods } = load("lib/rollover.ts");
const rent = [{ id: 1, label: "Hyra", category: "Boende", amount: 7000 }];
let state = {
  ...DEFAULT_STATE,
  income: 20000,
  fixed: rent,
  cycleAnchorDate: "2026-11-01",
  cycleEndDate: "2026-12-01",
};
const plan = (date) => readPlan(state, date);
const edit = (date, patch) => {
  state = { ...state, ...changePlan(state, date, patch) };
};

state = ensurePlans(state, "2026-12-01");
assert.deepEqual(
  plan("2026-12-01"),
  plan("2026-11-01"),
  "New month copies income and fixed expenses",
);
assert.notEqual(
  plan("2026-12-01").fixed,
  plan("2026-11-01").fixed,
  "Copies are independent",
);
assert.notEqual(plan("2026-12-01").fixed[0], plan("2026-11-01").fixed[0]);

edit("2026-12-01", {
  income: 15000,
  fixed: [{ ...rent[0], amount: 8000 }],
  override: 5000,
});
assert.equal(plan("2026-11-01").income, 20000);
assert.equal(plan("2026-11-01").fixed[0].amount, 7000);
assert.equal(plan("2026-11-01").override, null);
edit("2026-11-01", { income: 22000, fixed: [], override: 9000 });
assert.equal(
  plan("2026-12-01").income,
  15000,
  "Editing current month preserves future plan",
);
assert.equal(plan("2026-12-01").fixed[0].amount, 8000);
assert.equal(plan("2026-12-01").override, 5000);

state = ensurePlans(state, "2027-02-01");
assert.deepEqual(
  plan("2027-01-01"),
  plan("2026-12-01"),
  "Year boundary inherits preceding month",
);
assert.deepEqual(
  plan("2027-02-01"),
  plan("2027-01-01"),
  "Skipped months inherit in order",
);
const feb = structuredClone(plan("2027-02-01"));
edit("2027-01-01", { income: 0, fixed: [], override: null });
assert.deepEqual(
  plan("2027-02-01"),
  feb,
  "Editing middle month preserves following month",
);
assert.equal(
  plan("2026-12-01").income,
  15000,
  "Editing middle month preserves preceding month",
);
state = JSON.parse(JSON.stringify(state));
assert.equal(
  plan("2027-01-01").income,
  0,
  "Zero income survives backup/reload",
);

// Advance the actual period as the rollover does, then create its successor.
state = { ...state, cycleAnchorDate: "2027-02-01", cycleEndDate: "2027-03-01" };
state = ensurePlans(state, "2027-03-01");
assert.deepEqual(plan("2027-03-01"), feb);
assert.equal(plan("2026-11-01").income, 22000, "Rollover preserves history");

// Migration preserves an older staged plan and custom salary-day boundaries.
state = {
  ...DEFAULT_STATE,
  income: 25000,
  fixed: rent,
  budgetStartDay: 25,
  cycleAnchorDate: "2026-11-25",
  cycleEndDate: "2026-12-25",
  incomeHistory: [
    { from: "2026-11-25", amount: 25000 },
    { from: "2026-12-25", amount: 18000 },
  ],
  pendingFixed: { from: "2026-12-25", fixed: [] },
};
state = ensurePlans(state, "2027-02-25");
assert.equal(plan("2026-11-25").income, 25000);
assert.equal(plan("2026-12-25").income, 18000);
assert.deepEqual(plan("2026-12-25").fixed, []);
assert.equal(plan("2027-02-25").income, 18000);
assert.deepEqual(plan("2027-02-25").fixed, []);

// Run the SAME rollover used by the app, including multiple missed months.
state = {
  ...DEFAULT_STATE,
  income: 20000,
  fixed: rent,
  cycleAnchorDate: "2026-11-01",
  cycleEndDate: "2026-12-01",
  purchases: [
    {
      id: 1,
      label: "November",
      amount: 14000,
      type: "expense",
      category: null,
      date: "2026-11-15",
    },
    {
      id: 2,
      label: "December",
      amount: 6000,
      type: "expense",
      category: null,
      date: "2026-12-15",
    },
  ],
};
edit("2026-12-01", { income: 15000, fixed: [{ ...rent[0], amount: 8000 }] });
assert.equal(
  rollPeriods(state, new Date("2026-11-30T23:59:59")),
  null,
  "No premature rollover",
);
const december = rollPeriods(state, new Date("2026-12-01T00:00:00")).patch;
assert.equal(december.income, 15000, "Planned income activates at midnight");
assert.equal(december.fixed[0].amount, 8000);
assert.equal(
  december.streak,
  0,
  "No inferred success without an explicit review",
);
const january = rollPeriods(state, new Date("2027-01-01T00:00:00")).patch;
assert.equal(january.cycleAnchorDate, "2027-01-01");
assert.equal(january.income, 15000);
assert.equal(january.fixed[0].amount, 8000);
assert.equal(
  january.streak,
  0,
  "Missed rollovers do not fabricate verified success",
);
assert.equal(january.xp, 0, "Automatic rollover never grants unverified XP");
assert.equal(january.periodPlans["month:2026-11-01"].income, 20000);
assert.equal(january.periodPlans["month:2026-12-01"].income, 15000);
assert.equal(
  rollPeriods({ ...state, ...january }, new Date("2027-01-01T00:00:00")),
  null,
  "Reopening does not award twice",
);
assert.deepEqual(
  state.purchases.map((p) => p.date),
  ["2026-11-15", "2026-12-15"],
  "Transactions never get copied",
);
console.log(
  "Month isolation, inheritance, rollover, migration and persistence checks passed",
);

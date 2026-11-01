const assert = require("node:assert/strict");
const load = require("./load.cjs");
const { DEFAULT_STATE } = load("lib/types.ts");
const {
  addSavings,
  removeSavings,
  recordDebt,
  budgetMovements,
  savingsBalance,
  parseAmount,
  validDate,
} = load("lib/money.ts");
const { restoreState } = load("lib/storage.ts");
const { summarize, reviewPeriod } = load("lib/reviews.ts");
const { ensurePlans } = load("lib/plans.ts");
const { rollPeriods } = load("lib/rollover.ts");

let state = structuredClone({
  ...DEFAULT_STATE,
  hasOnboarded: true,
  income: 20000,
  fixed: [{ id: 1, label: "Hyra", amount: 7000, category: "Boende" }],
  cycleAnchorDate: "2026-11-01",
  cycleEndDate: "2026-12-01",
  loans: [
    {
      id: 5,
      label: "Testlån",
      originalAmount: 15000,
      currentBalance: 10000,
      lastUpdated: "2026-11-01",
      trackedStartingBalance: 10000,
    },
  ],
});
state = ensurePlans(state, "2026-12-01");
const apply = (patch) => (state = { ...state, ...patch });
const summary = () => summarize(state, "2026-11-01", "2026-12-01");
assert.equal(summary().remaining, 13000);
apply(
  addSavings(state, {
    id: 10,
    label: "Buffert",
    amount: 1000,
    date: "2026-11-01",
    kind: "transfer",
  }),
);
assert.equal(savingsBalance(state), 1000);
assert.equal(
  summary().remaining,
  12000,
  "Savings must reduce disposable budget",
);
assert.equal(
  budgetMovements(state, "2026-12-01", "2027-01-01").total,
  0,
  "Other month untouched",
);
apply(
  addSavings(state, {
    id: 11,
    label: "Uttag",
    amount: -200,
    date: "2026-11-01",
    kind: "transfer",
  }),
);
assert.equal(summary().remaining, 12200);
assert.equal(savingsBalance(state), 800);
apply(removeSavings(state, 11));
assert.equal(
  summary().remaining,
  12000,
  "Removing withdrawal reverses both sides",
);
assert.throws(() =>
  addSavings(state, {
    id: 12,
    label: "För stort uttag",
    amount: -1001,
    date: "2026-11-01",
    kind: "transfer",
  }),
);
apply(
  addSavings(state, {
    id: 13,
    label: "Ingående saldo",
    amount: 500,
    date: "2026-11-01",
    kind: "adjustment",
  }),
);
assert.equal(savingsBalance(state), 1500);
assert.equal(
  summary().remaining,
  12000,
  "Balance correction does not fabricate a cash flow",
);
assert.throws(() =>
  addSavings(state, {
    id: 13,
    label: "Dublett",
    amount: 500,
    date: "2026-11-01",
    kind: "transfer",
  }),
);

apply({
  purchases: [
    {
      id: 20,
      label: "Extra",
      amount: 500,
      type: "income",
      category: null,
      date: "2026-11-01",
    },
  ],
});
assert.equal(summary().remaining, 12500);
apply(
  addSavings(state, {
    id: 14,
    label: "Spara allt",
    amount: 500,
    date: "2026-11-01",
    kind: "transfer",
  }),
);
assert.equal(
  summary().remaining,
  12000,
  "Save all extra income is not available twice",
);
apply(
  recordDebt(state, {
    id: 30,
    loanId: 5,
    kind: "payment",
    date: "2026-11-01",
    principal: 1000,
    fees: 100,
    includedInFixed: false,
  }),
);
assert.equal(
  state.loans[0].currentBalance,
  9000,
  "Only principal reduces loan balance",
);
assert.equal(summary().remaining, 10900, "Full payment leaves budget");
apply(
  recordDebt(state, {
    id: 31,
    loanId: 5,
    kind: "payment",
    date: "2026-11-01",
    principal: 500,
    fees: 50,
    includedInFixed: true,
  }),
);
assert.equal(state.loans[0].currentBalance, 8500);
assert.equal(summary().remaining, 10900, "Fixed payment is not counted twice");
apply(
  recordDebt(state, {
    id: 32,
    loanId: 5,
    kind: "correction",
    date: "2026-11-01",
    balance: 8700,
    principal: 0,
    fees: 0,
    includedInFixed: false,
  }),
);
assert.equal(state.loans[0].currentBalance, 8700);
assert.equal(summary().remaining, 10900, "Correction is not a payment");
assert.equal(
  summary().principal,
  1500,
  "Actual amortization excludes corrections",
);
assert.throws(() =>
  recordDebt(state, {
    id: 33,
    loanId: 5,
    kind: "payment",
    date: "2026-10-01",
    principal: 100,
    fees: 0,
    includedInFixed: false,
  }),
);
assert.throws(() =>
  recordDebt(state, {
    id: 34,
    loanId: 5,
    kind: "payment",
    date: "2026-11-01",
    principal: 9000,
    fees: 0,
    includedInFixed: false,
  }),
);
assert.throws(() =>
  recordDebt(state, {
    id: 35,
    loanId: 5,
    kind: "payment",
    date: "2026-11-01",
    principal: NaN,
    fees: 0,
    includedInFixed: false,
  }),
);
assert.throws(() =>
  recordDebt(state, {
    id: 36,
    loanId: 5,
    kind: "correction",
    date: "2026-11-01",
    balance: -1,
    principal: 0,
    fees: 0,
    includedInFixed: false,
  }),
);

const restored = restoreState(JSON.parse(JSON.stringify(state)));
assert.deepEqual(
  summarize(restored, "2026-11-01", "2026-12-01"),
  summary(),
  "Backup round trip preserves calculations",
);
assert.equal(restored.loans[0].trackedStartingBalance, 10000);
const legacy = structuredClone(state);
delete legacy.schemaVersion;
delete legacy.debtEvents;
delete legacy.reviews;
delete legacy.savingsGoalName;
legacy.savingsDeposits = [{ id: 1, label: "Äldre sparande", amount: 2000 }];
delete legacy.loans[0].trackedStartingBalance;
const migrated = restoreState(legacy);
assert.equal(savingsBalance(migrated), 2000);
assert.equal(
  migrated.savingsDeposits[0].date,
  undefined,
  "Never invent a historical date",
);
assert.equal(
  budgetMovements(migrated, "2026-11-01", "2026-12-01").savings,
  0,
  "Older savings are not deducted retroactively",
);
assert.equal(
  migrated.loans[0].trackedStartingBalance,
  8700,
  "Track from first known balance, not original loan amount",
);
for (const invalid of [
  null,
  [],
  {},
  "budget",
  { ...state, income: null },
  { ...state, purchases: [{ amount: 100 }] },
  { ...state, loans: [{ ...state.loans[0], currentBalance: null }] },
  { ...state, periodPlans: [] },
  { ...state, schemaVersion: 99 },
])
  assert.throws(() => restoreState(invalid));

assert.equal(parseAmount("1 234,50"), 1234.5);
assert.equal(parseAmount("0"), 0);
for (const invalid of [
  "",
  " ",
  "1,2,3",
  "Infinity",
  "1.234",
  "1e3",
  "-",
  "12kr",
])
  assert.ok(Number.isNaN(parseAmount(invalid)), invalid);
assert.equal(validDate("2028-02-29"), true);
assert.equal(validDate("2027-02-29"), false);
assert.equal(validDate("nonsense"), false);

// Reviews reward the check, not an inferred financial result; once per period.
apply(reviewPeriod(state, "2026-11-01", "2026-12-01", "2026-11-15"));
assert.equal(state.xp, 0, "An interim check is not a completed month");
apply(reviewPeriod(state, "2026-11-01", "2026-12-01", "2026-12-01"));
assert.equal(state.xp, 20);
assert.equal(state.reviews["month:2026-11-01"].withinBudget, true);
apply(reviewPeriod(state, "2026-11-01", "2026-12-01", "2026-12-02"));
assert.equal(state.xp, 20, "Repeated review cannot award twice");
const signature = state.reviews["month:2026-11-01"].signature;
apply(
  addSavings(state, {
    id: 40,
    label: "Sen registrering",
    amount: 100,
    date: "2026-11-20",
    kind: "transfer",
  }),
);
assert.notEqual(
  summary().signature,
  signature,
  "Late corrections invalidate the check",
);
apply(reviewPeriod(state, "2026-11-01", "2026-12-01", "2026-12-03"));
assert.equal(state.xp, 20, "Correcting a review does not reward twice");
apply({ xpEnabled: false });
apply(reviewPeriod(state, "2026-12-01", "2027-01-01", "2027-01-01"));
assert.equal(state.xp, 20, "XP toggle respected");
const rollover = rollPeriods(state, new Date("2027-01-01T00:00:00"));
assert.equal(
  rollover.patch.xp,
  20,
  "Reopening months later does not infer success or XP",
);
console.log(
  "Money flows, corrections, backup migration, validation and reviews passed",
);

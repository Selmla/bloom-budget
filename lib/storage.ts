import { AppState, DEFAULT_STATE } from "./types";
import { validDate } from "./money";

// Validate before replacing an existing budget. Legacy amounts stay untouched;
// undated savings remain an opening balance, never a fabricated transfer.
export function restoreState(value: unknown): AppState {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("purchases" in value) ||
    !("fixed" in value)
  )
    throw new Error("Filen innehåller ingen Bloom-budget.");
  const input = value as Partial<AppState>;
  if (input.schemaVersion && input.schemaVersion > 2)
    throw new Error("Backupen är från en nyare appversion.");
  const state: AppState = { ...DEFAULT_STATE, ...input, schemaVersion: 2 };
  const number = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  const positive = (n: unknown) => number(n) && (n as number) >= 0;
  const text = (s: unknown) => typeof s === "string";
  const arr = (a: unknown) => Array.isArray(a);
  const fixed = (items: unknown) =>
    arr(items) &&
    (items as AppState["fixed"]).every(
      (e) =>
        e &&
        number(e.id) &&
        text(e.label) &&
        positive(e.amount) &&
        text(e.category),
    );
  if (
    !positive(state.income) ||
    !fixed(state.fixed) ||
    !positive(state.savingsGoal) ||
    !positive(state.monthlyContribution) ||
    !["month", "week"].includes(state.budgetPeriod) ||
    !Number.isInteger(state.budgetStartDay) ||
    state.budgetStartDay < 1 ||
    state.budgetStartDay > 28 ||
    !positive(state.xp) ||
    !positive(state.level) ||
    !positive(state.streak) ||
    !positive(state.debtReminderDays) ||
    !(state.budgetOverride === null || positive(state.budgetOverride)) ||
    !text(state.savingsGoalName) ||
    ![
      state.hasOnboarded,
      state.xpEnabled,
      state.noSpendEnabled,
      state.reminderEnabled,
    ].every((v) => typeof v === "boolean") ||
    ![state.cycleAnchorDate, state.cycleEndDate, state.lastNoSpendDate].every(
      (d) => d === null || validDate(d!),
    ) ||
    !(state.savingsTargetDate === "" || validDate(state.savingsTargetDate))
  )
    throw new Error("Backupen innehåller ogiltiga inställningar.");
  if (
    !arr(state.purchases) ||
    !state.purchases.every(
      (p) =>
        p &&
        number(p.id) &&
        text(p.label) &&
        positive(p.amount) &&
        ["income", "expense"].includes(p.type) &&
        validDate(p.date) &&
        (p.category === null || text(p.category)),
    ) ||
    !arr(state.savingsDeposits) ||
    !state.savingsDeposits.every(
      (e) =>
        e &&
        number(e.id) &&
        text(e.label) &&
        number(e.amount) &&
        (e.date === undefined || validDate(e.date)) &&
        (e.kind === undefined ||
          (["transfer", "adjustment"].includes(e.kind) &&
            validDate(e.date || ""))),
    ) ||
    !arr(state.loans) ||
    !state.loans.every(
      (l) =>
        l &&
        number(l.id) &&
        text(l.label) &&
        positive(l.originalAmount) &&
        positive(l.currentBalance) &&
        validDate(l.lastUpdated) &&
        (l.archived === undefined || typeof l.archived === "boolean") &&
        (l.trackedStartingBalance === undefined ||
          positive(l.trackedStartingBalance)),
    ) ||
    !arr(state.incomeHistory) ||
    !state.incomeHistory.every(
      (e) => e && validDate(e.from) && positive(e.amount),
    ) ||
    !arr(state.debtEvents) ||
    !state.debtEvents.every(
      (e) =>
        e &&
        number(e.id) &&
        number(e.loanId) &&
        validDate(e.date) &&
        ["payment", "correction"].includes(e.kind) &&
        positive(e.before) &&
        positive(e.after) &&
        positive(e.principal) &&
        positive(e.fees) &&
        typeof e.includedInFixed === "boolean",
    )
  )
    throw new Error("Backupen innehåller ogiltiga händelser.");
  if (
    !state.periodPlans ||
    typeof state.periodPlans !== "object" ||
    Array.isArray(state.periodPlans) ||
    !Object.entries(state.periodPlans).every(
      ([key, p]) =>
        /^(month|week):\d{4}-\d{2}-\d{2}$/.test(key) &&
        validDate(key.split(":")[1]) &&
        p &&
        positive(p.income) &&
        fixed(p.fixed) &&
        (p.override === null || positive(p.override)),
    ) ||
    !state.reviews ||
    typeof state.reviews !== "object" ||
    Array.isArray(state.reviews) ||
    !Object.entries(state.reviews).every(
      ([key, r]) =>
        /^(month|week):\d{4}-\d{2}-\d{2}$/.test(key) &&
        r &&
        validDate(r.reviewedAt) &&
        typeof r.withinBudget === "boolean",
    ) ||
    !(
      state.pendingFixed === null ||
      (state.pendingFixed &&
        validDate(state.pendingFixed.from) &&
        fixed(state.pendingFixed.fixed))
    )
  )
    throw new Error("Backupens månadsplaner är ogiltiga.");
  return {
    ...state,
    incomeHistory: [...state.incomeHistory].sort((a, b) =>
      a.from.localeCompare(b.from),
    ),
    loans: state.loans.map((l) => ({
      ...l,
      trackedStartingBalance: l.trackedStartingBalance ?? l.currentBalance,
    })),
  };
}

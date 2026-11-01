import { AppState, incomeAt } from "./types";
import { nextPeriodBounds, prevPeriodBounds, toISO } from "./dates";

export function planKey(state: AppState, from: string) {
  return `${state.budgetPeriod}:${from}`;
}

// Materialize each month in order. Existing plans are never rewritten by
// inheritance, including when an older month is corrected later.
export function ensurePlans(state: AppState, target: string): AppState {
  if (!state.cycleAnchorDate || !state.cycleEndDate) return state;
  const periodPlans = { ...state.periodPlans };
  let from = state.cycleAnchorDate;
  let end = new Date(`${state.cycleEndDate}T00:00:00`);
  let previous = {
    income: incomeAt(state.income, state.incomeHistory, from),
    fixed: state.fixed,
    override: state.budgetOverride,
  };
  // The older format had no fixed-expense history. Freeze its last known values
  // for the previous period before the first edit can change the live fallback.
  if (!periodPlans[planKey(state, from)]) {
    const [prior] = prevPeriodBounds(new Date(`${from}T00:00:00`), state.budgetPeriod, state.budgetStartDay);
    const priorFrom = toISO(prior);
    const key = planKey(state, priorFrom);
    if (!periodPlans[key]) periodPlans[key] = {
      ...previous,
      income: incomeAt(state.income, state.incomeHistory, priorFrom),
      fixed: previous.fixed.map(e => ({ ...e })),
    };
  }
  while (from <= target) {
    const key = planKey(state, from);
    if (!periodPlans[key]) {
      const pending = state.pendingFixed;
      periodPlans[key] = {
        ...previous,
        // Preserve already scheduled income from older versions during migration.
        ...(state.incomeHistory.some(e => e.from === from)
          ? { income: incomeAt(state.income, state.incomeHistory, from) } : {}),
        fixed: (pending && pending.from === from ? pending.fixed : previous.fixed).map(e => ({ ...e })),
      };
    }
    previous = periodPlans[key];
    const bounds = nextPeriodBounds(end, state.budgetPeriod, state.budgetStartDay);
    from = toISO(bounds[0]);
    end = bounds[1];
  }
  return { ...state, periodPlans };
}

export function readPlan(state: AppState, from: string) {
  return state.periodPlans[planKey(state, from)] ?? {
    income: incomeAt(state.income, state.incomeHistory, from),
    fixed: state.fixed,
    override: state.budgetOverride,
  };
}

export function changePlan(state: AppState, from: string, patch: Partial<ReturnType<typeof readPlan>>) {
  const prepared = ensurePlans(state, from);
  const plan = { ...readPlan(prepared, from), ...patch };
  return {
    periodPlans: { ...prepared.periodPlans, [planKey(state, from)]: plan },
    ...(from === state.cycleAnchorDate ? { income: plan.income, fixed: plan.fixed, budgetOverride: plan.override } : {}),
  };
}

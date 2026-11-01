import { AppState } from "./types";
import { nextPeriodBounds, toISO, WEEKS_PER_MONTH } from "./dates";
import { ensurePlans, readPlan } from "./plans";

export function rollPeriods(state: AppState, now: Date) {
  if (!state.cycleAnchorDate || !state.cycleEndDate) return null;
  let anchor = new Date(`${state.cycleAnchorDate}T00:00:00`);
  let end = new Date(`${state.cycleEndDate}T00:00:00`);
  if (now < end) return null;
  let plannedState = state;
  let { streak, xp, level } = state;
  let leveledUp = false;
  while (now >= end) {
    plannedState = ensurePlans(plannedState, toISO(anchor));
    const plan = readPlan(plannedState, toISO(anchor));
    const monthly = plan.override ?? (plan.income - plan.fixed.reduce((sum, e) => sum + e.amount, 0));
    const budget = state.budgetPeriod === "week" ? Math.round(monthly / WEEKS_PER_MONTH) : monthly;
    const netSpent = state.purchases
      .filter(p => p.date >= toISO(anchor) && p.date < toISO(end))
      .reduce((sum, p) => sum + (p.type === "income" ? -p.amount : p.amount), 0);
    if (budget >= netSpent) {
      streak += 1;
      xp += 50;
      if (xp >= 500) {
        xp -= 500;
        level += 1;
        leveledUp = true;
      }
    } else streak = 0;
    [anchor, end] = nextPeriodBounds(end, state.budgetPeriod, state.budgetStartDay);
  }
  plannedState = ensurePlans(plannedState, toISO(anchor));
  const active = readPlan(plannedState, toISO(anchor));
  return {
    leveledUp,
    patch: {
      periodPlans: plannedState.periodPlans,
      cycleAnchorDate: toISO(anchor), cycleEndDate: toISO(end),
      income: active.income, fixed: active.fixed, budgetOverride: active.override,
      pendingFixed: null, streak, xp, level,
    } satisfies Partial<AppState>,
  };
}

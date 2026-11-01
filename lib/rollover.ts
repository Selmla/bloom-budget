import { AppState } from "./types";
import { nextPeriodBounds, toISO } from "./dates";
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
    // Completion alone is not proof that purchases were recorded. Rewards are
    // granted by the explicit period review, including for difficult months.
    [anchor, end] = nextPeriodBounds(
      end,
      state.budgetPeriod,
      state.budgetStartDay,
    );
  }
  plannedState = ensurePlans(plannedState, toISO(anchor));
  const active = readPlan(plannedState, toISO(anchor));
  return {
    leveledUp,
    patch: {
      periodPlans: plannedState.periodPlans,
      cycleAnchorDate: toISO(anchor),
      cycleEndDate: toISO(end),
      income: active.income,
      fixed: active.fixed,
      budgetOverride: active.override,
      pendingFixed: null,
      streak,
      xp,
      level,
    } satisfies Partial<AppState>,
  };
}

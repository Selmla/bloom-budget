import { AppState, BudgetPeriod } from "./types";
import { readPlan, planKey } from "./plans";
import { WEEKS_PER_MONTH } from "./dates";
import { award, budgetMovements, money } from "./money";

export function summarize(
  state: AppState,
  from: string,
  end: string,
  period: BudgetPeriod = state.budgetPeriod,
) {
  const scoped = { ...state, budgetPeriod: period };
  const plan = readPlan(scoped, from);
  const monthly =
    plan.override ?? plan.income - plan.fixed.reduce((s, e) => s + e.amount, 0);
  const budget =
    period === "week" ? Math.round(monthly / WEEKS_PER_MONTH) : monthly;
  const purchases = state.purchases.filter(
    (p) => p.date >= from && p.date < end,
  );
  const spent = money(
    purchases
      .filter((p) => p.type === "expense")
      .reduce((s, p) => s + p.amount, 0),
  );
  const income = money(
    purchases
      .filter((p) => p.type === "income")
      .reduce((s, p) => s + p.amount, 0),
  );
  const movements = budgetMovements(state, from, end);
  const principal = money(
    state.debtEvents
      .filter((e) => e.kind === "payment" && e.date >= from && e.date < end)
      .reduce((s, e) => s + e.principal, 0),
  );
  const remaining = money(budget - spent + income - movements.total);
  // Content signature makes an old check visibly outdated after any relevant edit.
  const signature = JSON.stringify({
    plan,
    purchases,
    savings: state.savingsDeposits.filter(
      (e) => e.date && e.date >= from && e.date < end,
    ),
    debt: state.debtEvents.filter((e) => e.date >= from && e.date < end),
  });
  return { budget, spent, income, movements, principal, remaining, signature };
}
export function reviewPeriod(
  state: AppState,
  from: string,
  end: string,
  today: string,
): Partial<AppState> {
  const summary = summarize(state, from, end);
  const key = planKey(state, from);
  const existing = state.reviews[key];
  const complete = end <= today;
  const rewarded = !!existing?.rewarded;
  return {
    ...(!rewarded && complete ? award(state, 20) : {}),
    reviews: {
      ...state.reviews,
      [key]: {
        reviewedAt: today,
        withinBudget: summary.remaining >= 0,
        signature: summary.signature,
        complete,
        rewarded: rewarded || complete,
        end,
      },
    },
  };
}

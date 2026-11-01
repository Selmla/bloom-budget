export type FixedExpense = {
  id: number;
  label: string;
  amount: number;
  category: string;
};

export type Transaction = {
  id: number;
  label: string;
  amount: number;
  type: "expense" | "income";
  category: string | null;
  date: string; // ISO yyyy-mm-dd
};

export type SavingsDeposit = {
  id: number;
  label: string;
  amount: number;
  date?: string;
  kind?: "transfer" | "adjustment";
};

export type Loan = {
  id: number;
  label: string;
  originalAmount: number;
  currentBalance: number;
  lastUpdated: string; // ISO yyyy-mm-dd
  trackedStartingBalance?: number;
  archived?: boolean;
};

export type DebtEvent = {
  id: number;
  loanId: number;
  date: string;
  kind: "payment" | "correction";
  before: number;
  after: number;
  principal: number;
  fees: number;
  includedInFixed: boolean;
};

export type PeriodReview = {
  reviewedAt: string;
  withinBudget: boolean;
  complete?: boolean;
  rewarded?: boolean;
  signature?: string;
  end?: string;
};

export type BudgetPeriod = "month" | "week";

// A logged change of income, effective from `from` (the start of whichever budget
// period was active when it was set) until the next entry takes over. Lets past
// periods keep showing what income actually was then, even after you update it.
export type IncomeEntry = {
  from: string; // ISO yyyy-mm-dd
  amount: number;
};

// A staged set of fixed expenses waiting to take effect from the start of the
// next budget period. Kept separate from `fixed` (which always reflects only the
// current period) so editing it can never change the current period's numbers.
export type PendingFixed = {
  from: string; // ISO yyyy-mm-dd — the next period's start
  fixed: FixedExpense[];
};

export type AppState = {
  schemaVersion: number;
  savingsGoalName: string;
  debtEvents: DebtEvent[];
  reviews: Record<string, PeriodReview>;
  xpEnabled: boolean;
  noSpendEnabled: boolean;
  reminderEnabled: boolean;
  periodPlans: Record<
    string,
    { income: number; fixed: FixedExpense[]; override: number | null }
  >;
  hasOnboarded: boolean;
  income: number;
  incomeHistory: IncomeEntry[];
  fixed: FixedExpense[];
  pendingFixed: PendingFixed | null;
  purchases: Transaction[];
  xp: number;
  level: number;
  streak: number;
  savingsGoal: number;
  savingsTargetDate: string;
  savingsDeposits: SavingsDeposit[];
  monthlyContribution: number;
  loans: Loan[];
  debtReminderDays: number;
  budgetPeriod: BudgetPeriod;
  budgetStartDay: number;
  budgetOverride: number | null;
  lastNoSpendDate: string | null;
  // Start/end of the currently active budget period (week or month, whichever is
  // selected) — advances automatically past its end date. Reviews are explicit;
  // merely opening the app never counts as verified budget success.
  cycleAnchorDate: string | null;
  cycleEndDate: string | null;
};

export const DEFAULT_STATE: AppState = {
  schemaVersion: 2,
  savingsGoalName: "Mitt sparmål",
  debtEvents: [],
  reviews: {},
  xpEnabled: true,
  noSpendEnabled: false,
  reminderEnabled: true,
  periodPlans: {},
  hasOnboarded: false,
  income: 0,
  incomeHistory: [],
  fixed: [],
  pendingFixed: null,
  purchases: [],
  xp: 0,
  level: 1,
  streak: 0,
  savingsGoal: 0,
  savingsTargetDate: "",
  savingsDeposits: [],
  monthlyContribution: 0,
  loans: [],
  debtReminderDays: 30,
  budgetPeriod: "month",
  budgetStartDay: 1,
  budgetOverride: null,
  lastNoSpendDate: null,
  cycleAnchorDate: null,
  cycleEndDate: null,
};

// The income that was actually in effect on `dateISO`, per the logged history —
// falls back to the current live value for dates before any history exists.
export function incomeAt(
  income: number,
  incomeHistory: IncomeEntry[],
  dateISO: string,
): number {
  if (incomeHistory.length === 0) return income;
  let result = incomeHistory[0].amount;
  for (const entry of incomeHistory) {
    if (entry.from > dateISO) break;
    result = entry.amount;
  }
  return result;
}

// Keep a baseline when older saved data has no history, so scheduling the first
// future change cannot accidentally make it apply to the current period too.
export function incomeChange(
  state: Pick<AppState, "income" | "incomeHistory">,
  from: string,
  amount: number,
  currentFrom: string,
) {
  const history = state.incomeHistory.length
    ? state.incomeHistory
    : [{ from: "0001-01-01", amount: state.income }];
  const incomeHistory = [
    ...history.filter((entry) => entry.from !== from),
    { from, amount },
  ].sort((a, b) => a.from.localeCompare(b.from));
  return {
    incomeHistory,
    income: incomeAt(state.income, incomeHistory, currentFrom),
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  Boende: "#FF6B5B",
  Räkningar: "#FFB627",
  Försäkring: "#2EC4B6",
  Övrigt: "#C9AFC2",
};

export const PURCHASE_CATEGORY_COLORS: Record<string, string> = {
  Mat: "#FF6B5B",
  Nöje: "#FFB627",
  Transport: "#2EC4B6",
  Övrigt: "#C9AFC2",
};

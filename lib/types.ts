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
};

export type Loan = {
  id: number;
  label: string;
  originalAmount: number;
  currentBalance: number;
  lastUpdated: string; // ISO yyyy-mm-dd
};

export type BudgetPeriod = "month" | "week";

export type AppState = {
  hasOnboarded: boolean;
  income: number;
  fixed: FixedExpense[];
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
  // selected) — advances automatically past its end date, evaluating streak/XP
  // for the period that just ended. See the rollover effect in app/page.tsx.
  cycleAnchorDate: string | null;
  cycleEndDate: string | null;
};

export const DEFAULT_STATE: AppState = {
  hasOnboarded: false,
  income: 0,
  fixed: [],
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

export const CATEGORY_COLORS: Record<string, string> = {
  Boende: "#FF6B5B",
  "Räkningar": "#FFB627",
  "Försäkring": "#2EC4B6",
  "Övrigt": "#C9AFC2",
};

export const PURCHASE_CATEGORY_COLORS: Record<string, string> = {
  Mat: "#FF6B5B",
  "Nöje": "#FFB627",
  Transport: "#2EC4B6",
  "Övrigt": "#C9AFC2",
};

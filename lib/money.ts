import { AppState, SavingsDeposit, DebtEvent } from "./types";

export function parseAmount(text: string): number {
  const normalized = text
    .trim()
    .replace(/[\s\u00a0]/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Number(normalized);
}
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === Number(date.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(date.slice(5, 7)) &&
    parsed.getDate() === Number(date.slice(8, 10))
  );
}
export function newId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
export function money(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function award(state: AppState, amount: number): Partial<AppState> {
  if (!state.xpEnabled) return {};
  const total = state.xp + amount;
  return { xp: total % 500, level: state.level + Math.floor(total / 500) };
}
export function savingsBalance(state: Pick<AppState, "savingsDeposits">) {
  return money(
    state.savingsDeposits.reduce((sum, item) => sum + item.amount, 0),
  );
}
export function budgetMovements(state: AppState, from: string, end: string) {
  const inPeriod = (date?: string) => !!date && date >= from && date < end;
  const savings = money(
    state.savingsDeposits
      .filter((e) => e.kind === "transfer" && inPeriod(e.date))
      .reduce((s, e) => s + e.amount, 0),
  );
  const debt = money(
    state.debtEvents
      .filter(
        (e) => e.kind === "payment" && !e.includedInFixed && inPeriod(e.date),
      )
      .reduce((s, e) => s + e.principal + e.fees, 0),
  );
  return { savings, debt, total: money(savings + debt) };
}
export function addSavings(
  state: AppState,
  item: SavingsDeposit,
): Partial<AppState> {
  if (
    !Number.isFinite(item.amount) ||
    item.amount === 0 ||
    !item.label.trim() ||
    !item.date ||
    !validDate(item.date) ||
    !["transfer", "adjustment"].includes(item.kind || "")
  )
    throw new Error(
      "Ange beskrivning, giltigt datum och ett belopp som inte är noll.",
    );
  if (money(savingsBalance(state) + item.amount) < 0)
    throw new Error("Uttaget kan inte vara större än ditt sparsaldo.");
  if (state.savingsDeposits.some((e) => e.id === item.id))
    throw new Error("Händelsen finns redan.");
  return {
    savingsDeposits: [
      ...state.savingsDeposits,
      { ...item, amount: money(item.amount) },
    ],
  };
}
export function removeSavings(state: AppState, id: number): Partial<AppState> {
  const savingsDeposits = state.savingsDeposits.filter((e) => e.id !== id);
  if (savingsBalance({ savingsDeposits }) < 0)
    throw new Error(
      "Rätta senare uttag först, annars skulle saldot bli negativt.",
    );
  return { savingsDeposits };
}
export function recordDebt(
  state: AppState,
  event: Omit<DebtEvent, "before" | "after"> & { balance?: number },
): Partial<AppState> {
  const loan = state.loans.find((l) => l.id === event.loanId);
  if (!loan || loan.archived) throw new Error("Lånet är inte aktivt.");
  if (!validDate(event.date) || event.date < loan.lastUpdated)
    throw new Error(
      "Datumet måste vara samma som eller senare än lånets senaste uppdatering.",
    );
  if (state.debtEvents.some((e) => e.id === event.id))
    throw new Error("Händelsen finns redan.");
  if (
    event.kind === "payment" &&
    (!Number.isFinite(event.principal) ||
      !Number.isFinite(event.fees) ||
      event.principal < 0 ||
      event.fees < 0 ||
      event.principal + event.fees <= 0 ||
      event.principal > loan.currentBalance)
  ) {
    throw new Error(
      "Ange amortering och ränta/avgifter. Amorteringen får inte överstiga skulden.",
    );
  }
  if (
    event.kind === "correction" &&
    (!Number.isFinite(event.balance) || event.balance! < 0)
  )
    throw new Error("Ange ett giltigt saldo, minst 0 kr.");
  const after = money(
    event.kind === "payment"
      ? loan.currentBalance - event.principal
      : event.balance!,
  );
  const saved: DebtEvent = {
    id: event.id,
    loanId: loan.id,
    date: event.date,
    kind: event.kind,
    before: loan.currentBalance,
    after,
    principal: event.kind === "payment" ? money(event.principal) : 0,
    fees: event.kind === "payment" ? money(event.fees) : 0,
    includedInFixed: event.kind === "payment" && event.includedInFixed,
  };
  return {
    loans: state.loans.map((l) =>
      l.id === loan.id
        ? {
            ...l,
            currentBalance: after,
            lastUpdated: event.date,
            trackedStartingBalance:
              l.trackedStartingBalance ?? l.currentBalance,
          }
        : l,
    ),
    debtEvents: [...state.debtEvents, saved],
  };
}

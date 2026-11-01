"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  Plus,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  Card,
  Ring,
  Confetti,
  Modal,
  inputClass,
  primaryClass,
} from "../components/ui";
import { IntroScreen } from "../components/IntroScreen";
import { ReviewView } from "../components/ReviewView";
import {
  addSavings,
  removeSavings,
  recordDebt,
  budgetMovements,
  award,
  newId,
  parseAmount,
  validDate,
  money,
} from "../lib/money";
import { summarize, reviewPeriod } from "../lib/reviews";
import { FixedExpensesView } from "../components/FixedExpensesView";
import { SavingsView } from "../components/SavingsView";
import { DebtsView } from "../components/DebtsView";
import { BudgetView } from "../components/BudgetView";
import { rollPeriods } from "../lib/rollover";
import { ensurePlans, readPlan, changePlan } from "../lib/plans";
import { useAppUpdates } from "../lib/useAppUpdates";
import { useAppState } from "../lib/useAppState";
import { BudgetPeriod, PURCHASE_CATEGORY_COLORS } from "../lib/types";
import {
  todayISO,
  toISO,
  getISOWeek,
  daysLeftInWeek,
  periodBounds,
  nextPeriodBounds,
  prevPeriodBounds,
  cycleRangeLabel,
  budgetRingColor,
  WEEKS_PER_MONTH,
} from "../lib/dates";

type View = "home" | "fixed" | "savings" | "debts" | "budget" | "review";
// Negative offsets browse saved history, zero is current, positive is future.
// Browsing never changes the actual tracked period or triggers a rollover.
type ViewOffset = number;
const XP_TO_NEXT = 500;

function nextXpLevel(xp: number, level: number, amount: number) {
  const next = xp + amount;
  if (next >= XP_TO_NEXT)
    return { xp: next - XP_TO_NEXT, level: level + 1, leveledUp: true };
  return { xp: next, level, leveledUp: false };
}

function periodPhrase(period: BudgetPeriod, offset: ViewOffset): string {
  if (offset > 1) return period === "week" ? "vald vecka" : "vald månad";
  if (period === "week")
    return offset < 0
      ? "förra veckan"
      : offset > 0
        ? "nästa vecka"
        : "denna vecka";
  return offset < 0
    ? "förra månaden"
    : offset > 0
      ? "nästa månad"
      : "denna månad";
}

export default function HomePage() {
  const {
    state,
    ready,
    update,
    reset,
    exportBackup,
    importBackup,
    storageError,
    undoLabel,
    undo,
  } = useAppState();
  const updateWaiting = useAppUpdates(ready && !storageError);
  const [view, setView] = useState<View>("home");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDate, setDraftDate] = useState(todayISO());
  const [editingTx, setEditingTx] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [draftType, setDraftType] = useState<"expense" | "income">("expense");
  const [draftCategory, setDraftCategory] = useState("Övrigt");
  const [showAdd, setShowAdd] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [incomeSuggestion, setIncomeSuggestion] = useState<{
    amount: number;
  } | null>(null);
  const [viewOffset, setViewOffset] = useState<ViewOffset>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React only re-renders on a state change — with no ticking clock, date-based
  // displays (like "dagar kvar") and the period-rollover check below would freeze
  // if the app is just left open (or an installed PWA left running) across a day
  // boundary. Bump this whenever the app becomes visible again so both refresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);

  // Recompute the active period's boundaries immediately when switching between
  // week/month — the old boundaries describe a different kind of period entirely,
  // so reusing them would show the wrong date range in the transaction list.
  const prevPeriodRef = useRef(state.budgetPeriod);
  useEffect(() => {
    if (!ready) return;
    if (prevPeriodRef.current === state.budgetPeriod) return;
    prevPeriodRef.current = state.budgetPeriod;
    const [start, end] = periodBounds(
      new Date(),
      state.budgetPeriod,
      state.budgetStartDay,
    );
    update({ cycleAnchorDate: toISO(start), cycleEndDate: toISO(end) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.budgetPeriod]);

  // Roll the budget period forward once its end date has passed. Streak/XP are
  // evaluated automatically here from the purchase history of the period that
  // just ended — never through a manual button — so nothing depends on the app
  // happening to be open exactly when a period ends, and re-opening after a long
  // gap correctly catches up on every period that elapsed in between.
  // Changing budgetStartDay never retroactively moves an already-set boundary —
  // only the next rollover uses it.
  useEffect(() => {
    if (!ready) return;
    const now = new Date();

    if (!state.cycleAnchorDate || !state.cycleEndDate) {
      const [start, end] = periodBounds(
        now,
        state.budgetPeriod,
        state.budgetStartDay,
      );
      update({ cycleAnchorDate: toISO(start), cycleEndDate: toISO(end) });
      return;
    }

    const rollover = rollPeriods(state, now);
    if (!rollover) return;
    update(rollover.patch);
    // Drop back to viewing "now" in case the user had browsed to the period that
    // just became current (or later).
    setViewOffset(0);
    if (rollover.leveledUp) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    state.cycleAnchorDate,
    state.cycleEndDate,
    state.budgetPeriod,
    state.budgetStartDay,
    tick,
  ]);

  const currentPlan = readPlan(state, state.cycleAnchorDate || todayISO());
  // The period the home screen is currently displaying — independent of the real
  // tracked period above, and reset to "now" on every fresh load (not persisted).
  const viewedBounds = useMemo<[Date, Date] | null>(() => {
    if (!state.cycleAnchorDate || !state.cycleEndDate) return null;
    const anchor = new Date(state.cycleAnchorDate);
    const end = new Date(state.cycleEndDate);
    if (viewOffset === 0) return [anchor, end];
    if (viewOffset > 0) {
      let bounds: [Date, Date] = [anchor, end];
      for (let i = 0; i < viewOffset; i++)
        bounds = nextPeriodBounds(
          bounds[1],
          state.budgetPeriod,
          state.budgetStartDay,
        );
      return bounds;
    }
    let bounds: [Date, Date] = [anchor, end];
    for (let i = 0; i > viewOffset; i--)
      bounds = prevPeriodBounds(
        bounds[0],
        state.budgetPeriod,
        state.budgetStartDay,
      );
    return bounds;
  }, [
    state.cycleAnchorDate,
    state.cycleEndDate,
    state.budgetPeriod,
    state.budgetStartDay,
    viewOffset,
  ]);

  const viewedPurchases = useMemo(() => {
    if (!viewedBounds) return [];
    const [start, end] = viewedBounds;
    return state.purchases.filter((p) => {
      const d = new Date(p.date);
      return d >= start && d < end;
    });
  }, [state.purchases, viewedBounds]);

  const viewedFrom = viewedBounds
    ? toISO(viewedBounds[0])
    : state.cycleAnchorDate || todayISO();
  const earliestPlan =
    Object.keys(state.periodPlans)
      .filter((key) => key.startsWith(state.budgetPeriod + ":"))
      .map((key) => key.split(":")[1])
      .sort()[0] ||
    state.cycleAnchorDate ||
    todayISO();
  const viewedPlan = readPlan(ensurePlans(state, viewedFrom), viewedFrom);
  const viewedFixedTotal = viewedPlan.fixed.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const viewedMonthlyBudget =
    viewedPlan.override ?? viewedPlan.income - viewedFixedTotal;
  const viewedBudgetPlanned =
    state.budgetPeriod === "week"
      ? Math.round(viewedMonthlyBudget / WEEKS_PER_MONTH)
      : viewedMonthlyBudget;

  useEffect(() => {
    if (!ready || !viewedBounds || viewOffset < 0) return;
    const prepared = ensurePlans(state, viewedFrom);
    if (
      Object.keys(prepared.periodPlans).length !==
      Object.keys(state.periodPlans).length
    ) {
      update((prev) => ({
        periodPlans: ensurePlans(prev, viewedFrom).periodPlans,
      }));
    }
  }, [
    ready,
    viewedFrom,
    state.periodPlans,
    state.cycleAnchorDate,
    state.cycleEndDate,
  ]);

  function editViewedPlan(patch: Partial<typeof viewedPlan>) {
    update((prev) => changePlan(prev, viewedFrom, patch), "Månadsplan ändrad");
  }

  const viewedSpent = useMemo(
    () =>
      viewedPurchases
        .filter((p) => p.type === "expense")
        .reduce((s, p) => s + p.amount, 0),
    [viewedPurchases],
  );
  const viewedExtraIncome = useMemo(
    () =>
      viewedPurchases
        .filter((p) => p.type === "income")
        .reduce((s, p) => s + p.amount, 0),
    [viewedPurchases],
  );
  const movements = budgetMovements(
    state,
    viewedFrom,
    viewedBounds ? toISO(viewedBounds[1]) : viewedFrom,
  );
  const viewedRemaining = money(
    viewedBudgetPlanned - viewedSpent + viewedExtraIncome - movements.total,
  );
  const viewedIsOverBudget = viewedRemaining < 0;
  const viewedBudgetPct =
    viewedBudgetPlanned > 0
      ? Math.max(
          0,
          Math.min(
            100,
            100 -
              ((viewedSpent - viewedExtraIncome + movements.total) /
                viewedBudgetPlanned) *
                100,
          ),
        )
      : 0;

  const debtTotalOriginal = useMemo(
    () =>
      state.loans.reduce(
        (s, l) => s + (l.trackedStartingBalance ?? l.currentBalance),
        0,
      ),
    [state.loans],
  );
  const debtTotalCurrent = useMemo(
    () => state.loans.reduce((s, l) => s + l.currentBalance, 0),
    [state.loans],
  );
  const debtPct =
    debtTotalOriginal > 0
      ? ((debtTotalOriginal - debtTotalCurrent) / debtTotalOriginal) * 100
      : 0;

  const savingsCurrent = useMemo(
    () => state.savingsDeposits.reduce((s, d) => s + d.amount, 0),
    [state.savingsDeposits],
  );
  const savePct =
    state.savingsGoal > 0
      ? Math.min(100, (savingsCurrent / state.savingsGoal) * 100)
      : 0;

  const xpPct = (state.xp / XP_TO_NEXT) * 100;
  const todayStr = todayISO();
  const noSpendLoggedToday = state.lastNoSpendDate === todayStr;
  const spendingToday = state.purchases.some(
    (p) => p.date === todayStr && p.type === "expense" && p.amount > 0,
  );

  function awardXp(amount: number) {
    if (!state.xpEnabled) return;
    const { xp, level, leveledUp } = nextXpLevel(state.xp, state.level, amount);
    update({ xp, level });
    if (leveledUp) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1000);
    }
  }

  function logNoSpendDay() {
    if (noSpendLoggedToday || spendingToday) return;
    update({ lastNoSpendDate: todayStr });
    awardXp(20);
  }

  function addPurchase() {
    const amt = parseAmount(draftAmount);
    if (
      !draftLabel.trim() ||
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !validDate(draftDate)
    ) {
      setFormError(
        "Ange beskrivning, giltigt datum och belopp större än 0 kr.",
      );
      return;
    }
    // Planned (next-period) transactions are dated to that period's start, since
    // there's no real "today" inside a period that hasn't begun yet.
    const date = draftDate;
    const tx = {
      id: editingTx ?? newId(),
      label: draftLabel.trim(),
      amount: amt,
      type: draftType,
      category: draftType === "expense" ? draftCategory : null,
      date,
    };
    update(
      {
        purchases:
          editingTx === null
            ? [...state.purchases, tx]
            : state.purchases.map((p) => (p.id === editingTx ? tx : p)),
      },
      editingTx === null ? "Transaktion tillagd" : "Transaktion ändrad",
    );
    // Saving-a-portion only makes sense for money that's actually arrived.
    if (
      draftType === "income" &&
      viewOffset === 0 &&
      editingTx === null &&
      date <= todayISO()
    )
      setIncomeSuggestion({ amount: amt });
    setDraftLabel("");
    setDraftAmount("");
    setDraftType("expense");
    setDraftCategory("Övrigt");
    setShowAdd(false);
    setEditingTx(null);
    setFormError("");
  }

  function removePurchase(id: number) {
    update(
      { purchases: state.purchases.filter((p) => p.id !== id) },
      "Transaktion borttagen",
    );
  }

  function setIncome(income: number) {
    if (Number.isFinite(income) && income >= 0) editViewedPlan({ income });
  }

  function saveSuggestionToDeposits(amt: number) {
    const patch = addSavings(state, {
      id: newId(),
      label: "Från extra inkomst",
      amount: amt,
      date: todayISO(),
      kind: "transfer",
    });
    update(
      { ...patch, ...award(state, 10) },
      "Extra inkomst flyttad till sparande",
    );
    setIncomeSuggestion(null);
  }
  const undoNotice = undoLabel ? (
    <Card className="p-3 mb-4 flex justify-between gap-2">
      <span role="status">{undoLabel}</span>
      <button onClick={undo} className="font-bold underline">
        Ångra
      </button>
    </Card>
  ) : null;
  const notice = (
    <>
      {updateWaiting && (
        <Card className="p-3 mb-4 text-sm">
          <p role="status">
            En uppdatering är klar. Appen uppdateras när du stängt formuläret.
            Sparad data behålls.
          </p>
        </Card>
      )}
      {undoNotice}
    </>
  );
  const checked = state.reviews[state.budgetPeriod + ":" + viewedFrom];
  const periodSummary = viewedBounds
    ? summarize(state, viewedFrom, toISO(viewedBounds[1]))
    : null;
  const reviewValid = checked?.signature === periodSummary?.signature;
  const reviewCount = Object.entries(state.reviews).filter(([key, r]) => {
    const [period, from] = key.split(":");
    const p = period as BudgetPeriod;
    const [, end] = nextPeriodBounds(
      new Date(from + "T00:00:00"),
      p,
      state.budgetStartDay,
    );
    return (
      r.complete &&
      r.withinBudget &&
      r.signature === summarize(state, from, r.end || toISO(end), p).signature
    );
  }).length;

  if (!ready) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-cream">
        <p className="text-3xl animate-pulse">🌸</p>
      </div>
    );
  }

  if (storageError)
    return (
      <main className="max-w-sm mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold">Hjälp med sparad data</h1>
        <p role="alert">{storageError}</p>
        <button onClick={exportBackup} className="underline">
          Exportera säkerhetskopia
        </button>
        <label className="block">
          Importera backup
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && !(await importBackup(file)))
                window.alert(
                  "Filen är inte en giltig Bloom-backup. Din data har inte ändrats.",
                );
            }}
          />
        </label>
      </main>
    );

  if (!state.hasOnboarded) {
    return <IntroScreen onComplete={(patch) => update(patch)} />;
  }

  if (view === "fixed") {
    const planningNext = viewOffset > 0;
    return (
      <FixedExpensesView
        notice={notice}
        fixed={viewedPlan.fixed}
        setFixed={(fixed) => editViewedPlan({ fixed })}
        income={viewedPlan.income}
        setIncome={setIncome}
        planningNext={planningNext}
        periodLabel={
          viewedBounds
            ? cycleRangeLabel(viewedFrom, toISO(viewedBounds[1]))
            : ""
        }
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "savings")
    return (
      <SavingsView
        state={state}
        notice={notice}
        onBack={() => setView("home")}
        onChangeGoal={(
          savingsGoalName,
          savingsGoal,
          savingsTargetDate,
          monthlyContribution,
        ) =>
          update(
            {
              savingsGoalName,
              savingsGoal,
              savingsTargetDate,
              monthlyContribution,
            },
            "Sparmål ändrat",
          )
        }
        onAdd={(item) =>
          update(
            {
              ...addSavings(state, item),
              ...(item.kind === "transfer" && item.amount > 0
                ? award(state, 10)
                : {}),
            },
            "Sparhändelse registrerad",
          )
        }
        onRemove={(id) =>
          update(removeSavings(state, id), "Sparhändelse borttagen")
        }
      />
    );

  if (view === "debts")
    return (
      <DebtsView
        state={state}
        notice={notice}
        onBack={() => setView("home")}
        onSaveLoan={(loan) =>
          update(
            {
              loans: state.loans.some((l) => l.id === loan.id)
                ? state.loans.map((l) => (l.id === loan.id ? loan : l))
                : [...state.loans, loan],
            },
            "Låneuppgifter sparade",
          )
        }
        onRecord={(event) =>
          update(
            {
              ...recordDebt(state, event),
              ...(event.kind === "payment" && event.principal > 0
                ? award(state, 15)
                : {}),
            },
            event.kind === "payment"
              ? "Betalning registrerad"
              : "Saldo korrigerat",
          )
        }
        onArchive={(id, archived) =>
          update(
            {
              loans: state.loans.map((l) =>
                l.id === id ? { ...l, archived } : l,
              ),
            },
            "Lånets arkivering ändrad",
          )
        }
        onReminder={(debtReminderDays) => update({ debtReminderDays })}
      />
    );

  if (view === "review" && viewedBounds)
    return (
      <ReviewView
        state={state}
        from={viewedFrom}
        end={toISO(viewedBounds[1])}
        onBack={() => setView("home")}
        onConfirm={() =>
          update(
            reviewPeriod(state, viewedFrom, toISO(viewedBounds[1]), todayISO()),
            "Perioden avstämd",
          )
        }
        onNext={() => {
          setViewOffset(viewOffset + 1);
          setView("fixed");
        }}
        notice={notice}
      />
    );

  if (view === "budget") {
    return (
      <BudgetView
        notice={notice}
        showSettings={viewOffset === 0}
        readOnly={false}
        periodLabel={
          viewedBounds
            ? cycleRangeLabel(viewedFrom, toISO(viewedBounds[1]))
            : ""
        }
        period={state.budgetPeriod}
        setPeriod={(budgetPeriod) => update({ budgetPeriod })}
        startDay={state.budgetStartDay}
        setStartDay={(budgetStartDay) => update({ budgetStartDay })}
        income={viewedPlan.income}
        fixedTotal={viewedFixedTotal}
        override={viewedPlan.override}
        setOverride={(override) => editViewedPlan({ override })}
        budgetPlanned={viewedBudgetPlanned}
        spent={money(viewedSpent + movements.total)}
        extraIncome={viewedExtraIncome}
        periodEndDate={viewedBounds ? toISO(viewedBounds[1]) : null}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-cream">
      <div className="w-full max-w-sm px-5 pt-8 pb-24 relative">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[13px] font-medium text-mauve">Hej! 🌸</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewOffset((o) => o - 1)}
                disabled={viewedFrom <= earliestPlan}
                className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center bg-white border border-sand disabled:opacity-30"
                aria-label="Föregående period"
              >
                <ChevronLeft size={13} color="#241623" />
              </button>
              <h1 className="font-display text-xl font-bold text-ink">
                {!viewedBounds
                  ? new Date()
                      .toLocaleDateString("sv-SE", {
                        month: "long",
                        year: "numeric",
                      })
                      .replace(/^./, (c) => c.toUpperCase())
                  : state.budgetPeriod === "month" && state.budgetStartDay !== 1
                    ? cycleRangeLabel(
                        toISO(viewedBounds[0]),
                        toISO(viewedBounds[1]),
                      )
                    : viewedBounds[0]
                        .toLocaleDateString("sv-SE", {
                          month: "long",
                          year: "numeric",
                        })
                        .replace(/^./, (c) => c.toUpperCase())}
              </h1>
              <button
                onClick={() => setViewOffset((o) => o + 1)}
                className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center bg-white border border-sand disabled:opacity-30"
                aria-label="Nästa period"
              >
                <ChevronRight size={13} color="#241623" />
              </button>
            </div>
            <p className="text-[11px] font-medium mt-0.5 text-mauve">
              {!viewedBounds ? (
                ""
              ) : viewOffset === 0 ? (
                state.budgetPeriod === "week" ? (
                  `Vecka ${getISOWeek(viewedBounds[0])} · ${daysLeftInWeek()} dagar kvar`
                ) : (
                  `${Math.max(0, Math.round((viewedBounds[1].getTime() - Date.now()) / 86400000))} dagar kvar`
                )
              ) : (
                <>
                  {state.budgetPeriod === "week"
                    ? `Vecka ${getISOWeek(viewedBounds[0])} · `
                    : ""}
                  {viewOffset > 0
                    ? `Börjar om ${Math.max(0, Math.round((viewedBounds[0].getTime() - Date.now()) / 86400000))} dagar`
                    : "Avslutad"}
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowStreakInfo((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-peach border border-peachline"
          >
            <Flame size={16} color="#FFB627" fill="#FFB627" />
            <span className="text-sm font-bold text-ink">
              {reviewCount} avstämda
            </span>
          </button>
        </div>

        {showStreakInfo && (
          <Card className="p-3 mb-4 bg-peach border-peachline">
            <p className="text-[12px] text-ink">
              🌱 Avslutade perioder som du stämt av och hållit inom budget. Dina
              tidigare framsteg finns kvar även efter en svår månad.
            </p>
          </Card>
        )}

        {viewOffset !== 0 && (
          <Card className="p-3 mb-4 flex items-center justify-between gap-3 bg-peach border-peachline">
            <p className="text-[12px] font-semibold text-ink">
              {viewOffset > 0
                ? "Du planerar en kommande period — ändringar gäller bara denna period."
                : "Du tittar på en tidigare period. Du kan rätta dess registreringar."}
            </p>
            <button
              onClick={() => setViewOffset(0)}
              className="shrink-0 text-[11px] font-bold text-coral"
            >
              Till nu
            </button>
          </Card>
        )}

        {notice}
        {/* first-run prompt */}
        {currentPlan.income === 0 && (
          <Card className="p-4 mb-4 bg-peach border-peachline">
            <p className="text-[13px] font-bold mb-1 text-ink">Kom igång 🌸</p>
            <p className="text-[12px] mb-3 text-mauve">
              Lägg till din inkomst och dina fasta utgifter så börjar appen
              räkna ut din budget.
            </p>
            <button
              onClick={() => setView("fixed")}
              className="w-full rounded-xl py-2.5 text-[13px] font-bold bg-coral text-cream"
            >
              Sätt upp din budget
            </button>
          </Card>
        )}

        {/* remaining hero */}
        <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium" style={{ color: "#C9AFC2" }}>
              {viewOffset > 0
                ? "Planerat kvar"
                : viewOffset < 0
                  ? "Blev kvar"
                  : "Kvar enligt budget"}
            </p>
            <div
              className="flex rounded-full p-0.5"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <button
                onClick={() => {
                  update({ budgetPeriod: "month" });
                  setViewOffset(0);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-cream"
                style={{
                  background:
                    state.budgetPeriod === "month" ? "#FF6B5B" : "transparent",
                }}
              >
                Månad
              </button>
              <button
                onClick={() => {
                  update({ budgetPeriod: "week" });
                  setViewOffset(0);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-cream"
                style={{
                  background:
                    state.budgetPeriod === "week" ? "#FF6B5B" : "transparent",
                }}
              >
                Vecka
              </button>
            </div>
          </div>
          <p
            className="font-display text-4xl font-bold mt-1"
            style={{ color: viewedIsOverBudget ? "#FF6B5B" : "#FFF9F4" }}
          >
            {viewedRemaining.toLocaleString("sv-SE")} kr
          </p>
          <p className="text-[12px] mt-2" style={{ color: "#C9AFC2" }}>
            av {viewedBudgetPlanned.toLocaleString("sv-SE")} kr{" "}
            {periodPhrase(state.budgetPeriod, viewOffset)}
          </p>
          {viewedIsOverBudget && (
            <div
              className="mt-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,107,91,0.15)" }}
            >
              <p className="text-[12px] font-bold text-coral">
                ⚠️ {Math.abs(viewedRemaining).toLocaleString("sv-SE")} kr över
                budget
              </p>
            </div>
          )}
          <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-coral" />
        </div>

        <Card className="p-4 mb-4 text-sm space-y-2">
          <p>
            Flyttat till sparande:{" "}
            <strong>
              {movements.savings.toLocaleString("sv-SE")} kr netto
            </strong>
          </p>
          <p>
            Lånebetalningar utöver fasta utgifter:{" "}
            <strong>{movements.debt.toLocaleString("sv-SE")} kr</strong>
          </p>
          <p>
            Senast avstämt:{" "}
            {reviewValid
              ? checked.reviewedAt
              : checked
                ? "Registreringar har ändrats – stäm av igen"
                : "Inte avstämt"}
          </p>
          <p className="text-xs">
            Beloppet bygger på det du registrerat, inte ett hämtat banksaldo.
          </p>
          {viewOffset <= 0 && (
            <button
              onClick={() => setView("review")}
              className="font-bold underline"
            >
              Stäm av perioden
            </button>
          )}
          {state.reminderEnabled && viewOffset === 0 && !reviewValid && (
            <p>
              {" "}
              Nästa steg: kontrollera dina registreringar och stäm av perioden.
            </p>
          )}
        </Card>
        {/* three rings */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => setView("budget")} className="relative">
            <ChevronRight
              size={12}
              color="#D8C4B8"
              className="absolute top-2 right-2 z-10"
            />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring
                pct={viewedBudgetPct}
                color={budgetRingColor(viewedBudgetPct)}
              >
                <span className="text-[13px] font-bold text-ink">
                  {Math.round(viewedBudgetPct)}%
                </span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">
                Budget
              </span>
            </Card>
          </button>
          <button onClick={() => setView("debts")} className="relative">
            <ChevronRight
              size={12}
              color="#D8C4B8"
              className="absolute top-2 right-2 z-10"
            />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring pct={debtPct} color="#FFB627">
                <span className="text-[13px] font-bold text-ink">
                  {Math.round(debtPct)}%
                </span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">
                Skulder
              </span>
              <span className="text-xs">
                {debtTotalCurrent.toLocaleString("sv-SE")} kr kvar
              </span>
            </Card>
          </button>
          <button onClick={() => setView("savings")} className="relative">
            <ChevronRight
              size={12}
              color="#D8C4B8"
              className="absolute top-2 right-2 z-10"
            />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring pct={savePct} color="#2EC4B6">
                <span className="text-[13px] font-bold text-ink">
                  {Math.round(savePct)}%
                </span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">
                Sparande
              </span>
              <span className="text-xs">
                {savingsCurrent.toLocaleString("sv-SE")} kr sparat
              </span>
            </Card>
          </button>
        </div>

        {state.noSpendEnabled && viewOffset === 0 && (
          <>
            {/* no-spend day */}
            <button
              onClick={logNoSpendDay}
              disabled={noSpendLoggedToday || spendingToday}
              className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 mb-4"
              style={{
                background: noSpendLoggedToday ? "#F3E9DE" : "#EAFBF8",
                border: `1px solid ${noSpendLoggedToday ? "#F3E9DE" : "#C7F0E9"}`,
              }}
            >
              <span className="text-[13px]">🌱</span>
              <span
                className="text-[12px] font-bold"
                style={{ color: noSpendLoggedToday ? "#B08D7A" : "#1F9E90" }}
              >
                {noSpendLoggedToday
                  ? "No-spend dag loggad idag ✓"
                  : spendingToday
                    ? "Köp registrerat idag · en ny chans imorgon"
                    : "Logga no-spend dag"}
              </span>
            </button>
          </>
        )}
        {state.xpEnabled && (
          <>
            {/* XP bar */}
            <Card className="p-4 mb-4 relative">
              <Confetti show={celebrate} />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} color="#FF6B5B" />
                  <span className="text-[13px] font-bold text-ink">
                    Nivå {state.level}
                  </span>
                  <button
                    onClick={() => setShowXpInfo((v) => !v)}
                    className="h-4 w-4 rounded-full flex items-center justify-center bg-sand"
                    aria-label="Hur funkar XP?"
                  >
                    <span className="text-[10px] font-bold text-mauve">?</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-mauve">
                  {state.xp}/{XP_TO_NEXT} XP
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-sand">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${xpPct}%`,
                    background: "linear-gradient(90deg, #FF6B5B, #FFB627)",
                    transition: "width 500ms ease-out",
                  }}
                />
              </div>
              {showXpInfo && (
                <div className="mt-3 pt-3 space-y-1.5 border-t border-sand">
                  <p className="text-[11px] font-semibold mb-1 text-ink">
                    Så tjänar du XP
                  </p>
                  <p className="text-[11px] text-mauve">
                    🌱 No-spend dag · +20 XP
                  </p>
                  <p className="text-[11px] text-mauve">
                    🐷 Sparinsättning · +10 XP
                  </p>
                  <p className="text-[11px] text-mauve">
                    📉 Betala av ett lån · +15 XP
                  </p>
                  <p className="text-[11px] text-mauve">
                    ✅ Stäm av en avslutad period · +20 XP
                  </p>
                </div>
              )}
            </Card>
          </>
        )}
        {/* purchases */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-bold text-ink">
            Transaktioner {periodPhrase(state.budgetPeriod, viewOffset)}
          </h2>
          <span className="text-[12px] font-medium text-mauve">
            -{viewedSpent.toLocaleString("sv-SE")} kr
            {viewedExtraIncome > 0
              ? ` · +${viewedExtraIncome.toLocaleString("sv-SE")} kr`
              : ""}
          </span>
        </div>
        <Card className="overflow-hidden mb-4">
          {viewedPurchases.length === 0 && (
            <p className="text-[13px] p-4 text-mauve">
              {viewOffset > 0
                ? `Inget planerat ${periodPhrase(state.budgetPeriod, viewOffset)} än.`
                : `Inga transaktioner ${periodPhrase(state.budgetPeriod, viewOffset)}.`}
            </p>
          )}
          {viewedPurchases.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid #F3E9DE" }}
            >
              <div className="flex items-center gap-2">
                {p.category && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background:
                        PURCHASE_CATEGORY_COLORS[p.category] || "#C9AFC2",
                    }}
                  />
                )}
                <span className="text-[14px] font-medium text-ink">
                  {p.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: p.type === "income" ? "#2EC4B6" : "#241623" }}
                >
                  {p.type === "income" ? "+" : "-"}
                  {p.amount.toLocaleString("sv-SE")} kr
                </span>
                <>
                  <button
                    aria-label={"Redigera " + p.label}
                    onClick={() => {
                      setEditingTx(p.id);
                      setDraftLabel(p.label);
                      setDraftAmount(String(p.amount));
                      setDraftType(p.type);
                      setDraftCategory(p.category || "Övrigt");
                      setDraftDate(p.date);
                      setFormError("");
                      setShowAdd(true);
                    }}
                    className="p-2 underline text-xs"
                  >
                    Ändra
                  </button>
                  <button
                    onClick={() => removePurchase(p.id)}
                    aria-label={"Ta bort " + p.label}
                  >
                    <X size={14} color="#D8C4B8" />
                  </button>
                </>
              </div>
            </div>
          ))}
        </Card>

        {incomeSuggestion && (
          <Card
            className="p-4 mb-4 bg-[#EAFBF8]"
            style={{ borderColor: "#C7F0E9" }}
          >
            <p className="text-[13px] font-semibold mb-2 text-ink">
              Extra inkomst upptäckt — vill du spara en del?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  saveSuggestionToDeposits(money(incomeSuggestion.amount * 0.5))
                }
                className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-mint text-cream"
              >
                Spara{" "}
                {money(incomeSuggestion.amount * 0.5).toLocaleString("sv-SE")}{" "}
                kr
              </button>
              <button
                onClick={() =>
                  saveSuggestionToDeposits(incomeSuggestion.amount)
                }
                className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-ink text-cream"
              >
                Spara allt
              </button>
              <button
                onClick={() => setIncomeSuggestion(null)}
                className="rounded-xl px-3 py-2 text-[12px] font-bold bg-white text-mauve border border-sand"
              >
                Nej
              </button>
            </div>
          </Card>
        )}

        {/* fixed expenses row */}
        <button
          onClick={() => setView("fixed")}
          className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-4 bg-peach border border-peachline"
        >
          <span className="text-[13px] font-semibold text-ink">
            Inkomst och fasta utgifter{viewOffset > 0 ? " · vald period" : ""}
          </span>
          <ChevronRight size={16} color="#B08D7A" />
        </button>

        <Card className="p-4 mb-4 space-y-3 text-sm">
          <p className="font-bold">Dina inställningar</p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={state.xpEnabled}
              onChange={(e) => update({ xpEnabled: e.target.checked })}
            />
            Visa XP och belöningar
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={state.noSpendEnabled}
              onChange={(e) => update({ noSpendEnabled: e.target.checked })}
            />
            Visa frivillig no-spend-utmaning
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={state.reminderEnabled}
              onChange={(e) => update({ reminderEnabled: e.target.checked })}
            />
            Visa påminnelser i appen
          </label>
          <button
            className="underline"
            onClick={() =>
              window.dispatchEvent(new Event("bloom-check-update"))
            }
          >
            Sök efter appuppdatering
          </button>
          <p className="text-xs">
            Appen söker automatiskt efter uppdateringar när den är öppen och
            online. Sparad budget behålls.
          </p>
          <p>
            All data sparas på den här enheten. Exportera backup regelbundet och
            innan du byter enhet.
          </p>
        </Card>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
          <button
            onClick={exportBackup}
            className="text-[11px] font-bold text-mint"
          >
            Exportera backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-bold text-mint"
          >
            Importera backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const ok = await importBackup(file);
                window.alert(
                  ok
                    ? "Data återställd från backup!"
                    : "Kunde inte läsa filen — är det en giltig Bloom Budget-backup?",
                );
              }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => {
              if (window.confirm("Rensa all data i appen? Går inte att ångra."))
                reset();
            }}
            className="text-[11px] font-medium text-dust"
          >
            Rensa all data
          </button>
        </div>

        {!showAdd && (
          <button
            onClick={() => {
              setEditingTx(null);
              setDraftDate(viewOffset === 0 ? todayISO() : viewedFrom);
              setFormError("");
              setShowAdd(true);
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg bg-coral"
          >
            <Plus size={18} color="#FFF9F4" />
            <span className="text-[14px] font-bold text-cream">
              {viewOffset > 0 ? "Planera transaktion" : "Lägg till transaktion"}
            </span>
          </button>
        )}

        {showAdd && (
          <Modal
            title={
              editingTx !== null
                ? "Ändra transaktion"
                : viewOffset > 0
                  ? "Planerad transaktion"
                  : "Ny transaktion"
            }
            onClose={() => setShowAdd(false)}
          >
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addPurchase();
              }}
            >
              <p className="text-sm">
                Datumet avgör vilken period transaktionen hör till.
                Sparöverföringar och lånebetalningar registreras i sina egna
                vyer.
              </p>
              <label className="block text-sm">
                Typ
                <select
                  aria-label="Transaktionstyp"
                  className={inputClass}
                  value={draftType}
                  onChange={(e) =>
                    setDraftType(e.target.value as "expense" | "income")
                  }
                >
                  <option value="expense">Köp</option>
                  <option value="income">Extra inkomst</option>
                </select>
              </label>
              <label className="block text-sm">
                Beskrivning
                <input
                  className={inputClass}
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Belopp (kr)
                <input
                  className={inputClass}
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
              <label className="block text-sm">
                Datum
                <input
                  aria-label="Transaktionsdatum"
                  className={inputClass}
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  required
                />
              </label>
              {draftType === "expense" && (
                <label className="block text-sm">
                  Kategori
                  <select
                    className={inputClass}
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                  >
                    {Object.keys(PURCHASE_CATEGORY_COLORS).map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
              )}
              {formError && <p role="alert">{formError}</p>}
              <button className={primaryClass}>
                {editingTx !== null ? "Spara ändringar" : "Lägg till"}
              </button>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}

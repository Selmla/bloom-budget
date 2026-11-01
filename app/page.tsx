"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Plus, Sparkles, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, Ring, Confetti } from "../components/ui";
import { IntroScreen } from "../components/IntroScreen";
import { FixedExpensesView } from "../components/FixedExpensesView";
import { SavingsView } from "../components/SavingsView";
import { DebtsView } from "../components/DebtsView";
import { BudgetView } from "../components/BudgetView";
import { useAppState } from "../lib/useAppState";
import { BudgetPeriod, FixedExpense, PURCHASE_CATEGORY_COLORS, incomeAt, incomeChange } from "../lib/types";
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

type View = "home" | "fixed" | "savings" | "debts" | "budget";
// -1 = previous period (read-only history), 0 = the real current period, 1 = next
// period (can plan ahead into it). Purely a home-screen viewing choice — it never
// touches state.cycleAnchorDate/cycleEndDate, which is what the automatic
// streak/XP rollover actually tracks, so browsing can never desync a real rollover.
type ViewOffset = -1 | 0 | 1;
const XP_TO_NEXT = 500;

function nextXpLevel(xp: number, level: number, amount: number) {
  const next = xp + amount;
  if (next >= XP_TO_NEXT) return { xp: next - XP_TO_NEXT, level: level + 1, leveledUp: true };
  return { xp: next, level, leveledUp: false };
}

function periodPhrase(period: BudgetPeriod, offset: ViewOffset): string {
  if (period === "week") return offset === -1 ? "förra veckan" : offset === 1 ? "nästa vecka" : "denna vecka";
  return offset === -1 ? "förra månaden" : offset === 1 ? "nästa månad" : "denna månad";
}

export default function HomePage() {
  const { state, ready, update, reset, exportBackup, importBackup } = useAppState();
  const [view, setView] = useState<View>("home");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftType, setDraftType] = useState<"expense" | "income">("expense");
  const [draftCategory, setDraftCategory] = useState("Övrigt");
  const [showAdd, setShowAdd] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [incomeSuggestion, setIncomeSuggestion] = useState<{ amount: number } | null>(null);
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
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Register the service worker so the app can be installed and used offline.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Recompute the active period's boundaries immediately when switching between
  // week/month — the old boundaries describe a different kind of period entirely,
  // so reusing them would show the wrong date range in the transaction list.
  const prevPeriodRef = useRef(state.budgetPeriod);
  useEffect(() => {
    if (!ready) return;
    if (prevPeriodRef.current === state.budgetPeriod) return;
    prevPeriodRef.current = state.budgetPeriod;
    const [start, end] = periodBounds(new Date(), state.budgetPeriod, state.budgetStartDay);
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
      const [start, end] = periodBounds(now, state.budgetPeriod, state.budgetStartDay);
      update({ cycleAnchorDate: toISO(start), cycleEndDate: toISO(end) });
      return;
    }

    let anchor = new Date(state.cycleAnchorDate);
    let end = new Date(state.cycleEndDate);
    if (now < end) return;

    const fixedTotalNow = state.fixed.reduce((s, e) => s + e.amount, 0);
    let streak = state.streak;
    let xp = state.xp;
    let level = state.level;
    let leveledUp = false;

    while (now >= end) {
      const periodPurchases = state.purchases.filter((p) => {
        const d = new Date(p.date);
        return d >= anchor && d < end;
      });
      const periodSpent = periodPurchases.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0);
      const periodIncome = periodPurchases.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0);
      const monthlyPlan = incomeAt(state.income, state.incomeHistory, toISO(anchor)) - fixedTotalNow;
      const periodBudget =
        state.budgetOverride !== null
          ? state.budgetPeriod === "week"
            ? Math.round(state.budgetOverride / WEEKS_PER_MONTH)
            : state.budgetOverride
          : state.budgetPeriod === "week"
          ? Math.round(monthlyPlan / WEEKS_PER_MONTH)
          : monthlyPlan;

      if (periodBudget - periodSpent + periodIncome >= 0) {
        streak += 1;
        const res = nextXpLevel(xp, level, 50);
        xp = res.xp;
        level = res.level;
        leveledUp = leveledUp || res.leveledUp;
      } else {
        streak = 0;
      }

      [anchor, end] = nextPeriodBounds(end, state.budgetPeriod, state.budgetStartDay);
    }

    // A real rollover happened — promote any fixed-expenses plan staged for the
    // period that's now starting, so it becomes the live figure from here on.
    update({
      cycleAnchorDate: toISO(anchor),
      cycleEndDate: toISO(end),
      streak,
      xp,
      level,
      income: incomeAt(state.income, state.incomeHistory, toISO(anchor)),
      ...(state.pendingFixed ? { fixed: state.pendingFixed.fixed, pendingFixed: null } : {}),
    });
    // Drop back to viewing "now" in case the user had browsed to the period that
    // just became current (or later).
    setViewOffset(0);
    if (leveledUp) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.cycleAnchorDate, state.cycleEndDate, state.budgetPeriod, state.budgetStartDay, tick]);

  const fixedTotal = useMemo(() => state.fixed.reduce((s, e) => s + e.amount, 0), [state.fixed]);

  // The real, tracked current period — always what streak/XP evaluate against,
  // and what the Budget view shows, regardless of what's being browsed below.
  const realCurrentPurchases = useMemo(() => {
    if (!state.cycleAnchorDate || !state.cycleEndDate) return [];
    const start = new Date(state.cycleAnchorDate);
    const end = new Date(state.cycleEndDate);
    return state.purchases.filter((p) => {
      const d = new Date(p.date);
      return d >= start && d < end;
    });
  }, [state.purchases, state.cycleAnchorDate, state.cycleEndDate]);

  const spent = useMemo(() => realCurrentPurchases.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0), [realCurrentPurchases]);
  const extraIncome = useMemo(() => realCurrentPurchases.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0), [realCurrentPurchases]);

  const monthlyBudgetPlanned = state.income - fixedTotal;
  // Always the live, current-moment figure — what Budget view shows, unaffected
  // by whatever period is being browsed on the home screen below.
  const budgetPlanned =
    state.budgetOverride !== null
      ? state.budgetPeriod === "week"
        ? Math.round(state.budgetOverride / WEEKS_PER_MONTH)
        : state.budgetOverride
      : state.budgetPeriod === "week"
      ? Math.round(monthlyBudgetPlanned / WEEKS_PER_MONTH)
      : monthlyBudgetPlanned;

  // The period the home screen is currently displaying — independent of the real
  // tracked period above, and reset to "now" on every fresh load (not persisted).
  const viewedBounds = useMemo<[Date, Date] | null>(() => {
    if (!state.cycleAnchorDate || !state.cycleEndDate) return null;
    const anchor = new Date(state.cycleAnchorDate);
    const end = new Date(state.cycleEndDate);
    if (viewOffset === 0) return [anchor, end];
    if (viewOffset === 1) return nextPeriodBounds(end, state.budgetPeriod, state.budgetStartDay);
    return prevPeriodBounds(anchor, state.budgetPeriod, state.budgetStartDay);
  }, [state.cycleAnchorDate, state.cycleEndDate, state.budgetPeriod, state.budgetStartDay, viewOffset]);

  const viewedPurchases = useMemo(() => {
    if (!viewedBounds) return [];
    const [start, end] = viewedBounds;
    return state.purchases.filter((p) => {
      const d = new Date(p.date);
      return d >= start && d < end;
    });
  }, [state.purchases, viewedBounds]);

  // If fixed expenses have been staged for next period, that's what "next" should
  // plan against — current/past are untouched by it, they only ever see `fixed`.
  const viewedFixedTotal =
    viewOffset === 1 && state.pendingFixed ? state.pendingFixed.fixed.reduce((s, e) => s + e.amount, 0) : fixedTotal;

  // Uses the income that was actually in effect at the start of the VIEWED period —
  // editing income today only reshapes the current and future periods; a period
  // you're browsing in the past keeps showing what its budget genuinely was.
  // (Any custom override isn't logged this way yet, so it still uses today's live
  // value for every period — see TODO.md.)
  const viewedBudgetPlanned = useMemo(() => {
    if (!viewedBounds) return budgetPlanned;
    const viewedMonthlyPlanned = incomeAt(state.income, state.incomeHistory, toISO(viewedBounds[0])) - viewedFixedTotal;
    return state.budgetOverride !== null
      ? state.budgetPeriod === "week"
        ? Math.round(state.budgetOverride / WEEKS_PER_MONTH)
        : state.budgetOverride
      : state.budgetPeriod === "week"
      ? Math.round(viewedMonthlyPlanned / WEEKS_PER_MONTH)
      : viewedMonthlyPlanned;
  }, [viewedBounds, state.income, state.incomeHistory, viewedFixedTotal, state.budgetOverride, state.budgetPeriod]);

  const viewedSpent = useMemo(() => viewedPurchases.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0), [viewedPurchases]);
  const viewedExtraIncome = useMemo(() => viewedPurchases.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0), [viewedPurchases]);
  const viewedRemaining = viewedBudgetPlanned - viewedSpent + viewedExtraIncome;
  const viewedIsOverBudget = viewedRemaining < 0;
  const viewedBudgetPct =
    viewedBudgetPlanned > 0 ? Math.max(0, Math.min(100, 100 - ((viewedSpent - viewedExtraIncome) / viewedBudgetPlanned) * 100)) : 0;

  const debtTotalOriginal = useMemo(() => state.loans.reduce((s, l) => s + l.originalAmount, 0), [state.loans]);
  const debtTotalCurrent = useMemo(() => state.loans.reduce((s, l) => s + l.currentBalance, 0), [state.loans]);
  const debtPct = debtTotalOriginal > 0 ? ((debtTotalOriginal - debtTotalCurrent) / debtTotalOriginal) * 100 : 0;

  const savingsCurrent = useMemo(() => state.savingsDeposits.reduce((s, d) => s + d.amount, 0), [state.savingsDeposits]);
  const savePct = state.savingsGoal > 0 ? Math.min(100, (savingsCurrent / state.savingsGoal) * 100) : 0;

  const xpPct = (state.xp / XP_TO_NEXT) * 100;
  const todayStr = todayISO();
  const noSpendLoggedToday = state.lastNoSpendDate === todayStr;

  function awardXp(amount: number) {
    const { xp, level, leveledUp } = nextXpLevel(state.xp, state.level, amount);
    update({ xp, level });
    if (leveledUp) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1000);
    }
  }

  function logNoSpendDay() {
    if (noSpendLoggedToday) return;
    update({ lastNoSpendDate: todayStr });
    awardXp(20);
  }

  function addPurchase() {
    if (viewOffset === -1) return; // history is read-only
    const amt = parseFloat(draftAmount);
    if (!draftLabel.trim() || !amt || amt <= 0) return;
    // Planned (next-period) transactions are dated to that period's start, since
    // there's no real "today" inside a period that hasn't begun yet.
    const date = viewOffset === 1 && viewedBounds ? toISO(viewedBounds[0]) : todayISO();
    const tx = {
      id: Date.now(),
      label: draftLabel.trim(),
      amount: amt,
      type: draftType,
      category: draftType === "expense" ? draftCategory : null,
      date,
    };
    update({ purchases: [...state.purchases, tx] });
    // Saving-a-portion only makes sense for money that's actually arrived.
    if (draftType === "income" && viewOffset === 0) setIncomeSuggestion({ amount: amt });
    setDraftLabel("");
    setDraftAmount("");
    setDraftType("expense");
    setDraftCategory("Övrigt");
    setShowAdd(false);
  }

  function removePurchase(id: number) {
    update({ purchases: state.purchases.filter((p) => p.id !== id) });
  }

  // Logs *when* an income change takes effect (the start of the current tracked
  // period) so past periods keep showing what income actually was back then.
  // Editing again within the same period corrects that entry in place rather
  // than logging a second change for a period that hasn't even ended yet.
  function setIncome(newIncome: number) {
    if (viewOffset === -1 || !Number.isFinite(newIncome) || newIncome < 0) return;
    const currentFrom = state.cycleAnchorDate || todayISO();
    if (viewOffset === 1 && !viewedBounds) return;
    const from = viewOffset === 1 ? toISO(viewedBounds![0]) : currentFrom;
    update((prev) => incomeChange(prev, from, newIncome, currentFrom));
  }

  // Stages fixed expenses for the period that hasn't started yet — `fixed` itself
  // is left untouched, so this can never change the current period's numbers. It
  // gets promoted to `fixed` automatically once that period actually begins (see
  // the rollover effect above).
  function stageFixedForNextPeriod(newFixed: FixedExpense[]) {
    if (!viewedBounds) return;
    update({ pendingFixed: { from: toISO(viewedBounds[0]), fixed: newFixed } });
  }

  function saveSuggestionToDeposits(amt: number) {
    update({ savingsDeposits: [...state.savingsDeposits, { id: Date.now(), label: "Från extra inkomst", amount: amt }] });
    awardXp(10);
    setIncomeSuggestion(null);
  }

  if (!ready) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-cream">
        <p className="text-3xl animate-pulse">🌸</p>
      </div>
    );
  }

  if (!state.hasOnboarded) {
    return <IntroScreen onStart={() => update({ hasOnboarded: true })} />;
  }

  if (view === "fixed") {
    const planningNext = viewOffset === 1;
    return (
      <FixedExpensesView
        fixed={planningNext ? state.pendingFixed?.fixed ?? state.fixed : state.fixed}
        setFixed={planningNext ? stageFixedForNextPeriod : (fixed) => update({ fixed })}
        income={planningNext && viewedBounds ? incomeAt(state.income, state.incomeHistory, toISO(viewedBounds[0])) : state.income}
        setIncome={setIncome}
        planningNext={planningNext}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "savings") {
    return (
      <SavingsView
        goal={state.savingsGoal}
        setGoal={(savingsGoal) => update({ savingsGoal })}
        targetDate={state.savingsTargetDate}
        setTargetDate={(savingsTargetDate) => update({ savingsTargetDate })}
        deposits={state.savingsDeposits}
        setDeposits={(savingsDeposits) => update({ savingsDeposits })}
        monthlyContribution={state.monthlyContribution}
        setMonthlyContribution={(monthlyContribution) => update({ monthlyContribution })}
        current={savingsCurrent}
        onAwardXp={awardXp}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "debts") {
    return (
      <DebtsView
        loans={state.loans}
        setLoans={(loans) => update({ loans })}
        reminderDays={state.debtReminderDays}
        setReminderDays={(debtReminderDays) => update({ debtReminderDays })}
        onAwardXp={awardXp}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "budget") {
    return (
      <BudgetView
        period={state.budgetPeriod}
        setPeriod={(budgetPeriod) => update({ budgetPeriod })}
        startDay={state.budgetStartDay}
        setStartDay={(budgetStartDay) => update({ budgetStartDay })}
        income={state.income}
        fixedTotal={fixedTotal}
        override={state.budgetOverride}
        setOverride={(budgetOverride) => update({ budgetOverride })}
        budgetPlanned={budgetPlanned}
        spent={spent}
        extraIncome={extraIncome}
        periodEndDate={state.cycleEndDate}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-cream">
      <div className="w-full max-w-sm px-5 pt-8 pb-24 relative">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[13px] font-medium text-mauve">Hej! 🌸</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewOffset((o) => (o > -1 ? ((o - 1) as ViewOffset) : o))}
                disabled={viewOffset === -1}
                className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center bg-white border border-sand disabled:opacity-30"
                aria-label="Föregående period"
              >
                <ChevronLeft size={13} color="#241623" />
              </button>
              <h1 className="font-display text-2xl font-bold text-ink">
                {!viewedBounds
                  ? new Date().toLocaleDateString("sv-SE", { month: "long" }).replace(/^./, (c) => c.toUpperCase())
                  : state.budgetPeriod === "month" && state.budgetStartDay !== 1
                  ? cycleRangeLabel(toISO(viewedBounds[0]), toISO(viewedBounds[1]))
                  : viewedBounds[0].toLocaleDateString("sv-SE", { month: "long" }).replace(/^./, (c) => c.toUpperCase())}
              </h1>
              <button
                onClick={() => setViewOffset((o) => (o < 1 ? ((o + 1) as ViewOffset) : o))}
                disabled={viewOffset === 1}
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
                  {state.budgetPeriod === "week" ? `Vecka ${getISOWeek(viewedBounds[0])} · ` : ""}
                  {viewOffset === 1
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
              {state.streak} {state.budgetPeriod === "week" ? "veckor" : "mån"}
            </span>
          </button>
        </div>

        {showStreakInfo && (
          <Card className="p-3 mb-4 bg-peach border-peachline">
            <p className="text-[12px] text-ink">
              🔥 Antal {state.budgetPeriod === "week" ? "veckor" : "månader"} i rad du hållit dig inom din budget. Uppdateras
              automatiskt när {state.budgetPeriod === "week" ? "veckan" : "månaden"} tar slut — går du över nollställs den.
            </p>
          </Card>
        )}

        {viewOffset !== 0 && (
          <Card className="p-3 mb-4 flex items-center justify-between gap-3 bg-peach border-peachline">
            <p className="text-[12px] font-semibold text-ink">
              {viewOffset === 1 ? "Du planerar en kommande period — inget räknas ännu." : "Du tittar på en avslutad period (historik)."}
            </p>
            <button onClick={() => setViewOffset(0)} className="shrink-0 text-[11px] font-bold text-coral">
              Till nu
            </button>
          </Card>
        )}

        {/* first-run prompt */}
        {state.income === 0 && (
          <Card className="p-4 mb-4 bg-peach border-peachline">
            <p className="text-[13px] font-bold mb-1 text-ink">Kom igång 🌸</p>
            <p className="text-[12px] mb-3 text-mauve">Lägg till din inkomst och dina fasta utgifter så börjar appen räkna ut din budget.</p>
            <button onClick={() => setView("fixed")} className="w-full rounded-xl py-2.5 text-[13px] font-bold bg-coral text-cream">
              Sätt upp din budget
            </button>
          </Card>
        )}

        {/* remaining hero */}
        <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium" style={{ color: "#C9AFC2" }}>
              {viewOffset === 1 ? "Planerat kvar" : viewOffset === -1 ? "Blev kvar" : "Kvar att röra dig med"}
            </p>
            <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => {
                  update({ budgetPeriod: "month" });
                  setViewOffset(0);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-cream"
                style={{ background: state.budgetPeriod === "month" ? "#FF6B5B" : "transparent" }}
              >
                Månad
              </button>
              <button
                onClick={() => {
                  update({ budgetPeriod: "week" });
                  setViewOffset(0);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-cream"
                style={{ background: state.budgetPeriod === "week" ? "#FF6B5B" : "transparent" }}
              >
                Vecka
              </button>
            </div>
          </div>
          <p className="font-display text-4xl font-bold mt-1" style={{ color: viewedIsOverBudget ? "#FF6B5B" : "#FFF9F4" }}>
            {viewedRemaining.toLocaleString("sv-SE")} kr
          </p>
          <p className="text-[12px] mt-2" style={{ color: "#C9AFC2" }}>
            av {viewedBudgetPlanned.toLocaleString("sv-SE")} kr {periodPhrase(state.budgetPeriod, viewOffset)}
          </p>
          {viewedIsOverBudget && (
            <div className="mt-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,107,91,0.15)" }}>
              <p className="text-[12px] font-bold text-coral">⚠️ {Math.abs(viewedRemaining).toLocaleString("sv-SE")} kr över budget</p>
            </div>
          )}
          <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-coral" />
        </div>

        {/* three rings */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => setView("budget")} className="relative">
            <ChevronRight size={12} color="#D8C4B8" className="absolute top-2 right-2 z-10" />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring pct={viewedBudgetPct} color={budgetRingColor(viewedBudgetPct)}>
                <span className="text-[13px] font-bold text-ink">{Math.round(viewedBudgetPct)}%</span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">Budget</span>
            </Card>
          </button>
          <button onClick={() => setView("debts")} className="relative">
            <ChevronRight size={12} color="#D8C4B8" className="absolute top-2 right-2 z-10" />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring pct={debtPct} color="#FFB627">
                <span className="text-[13px] font-bold text-ink">{Math.round(debtPct)}%</span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">Skulder</span>
            </Card>
          </button>
          <button onClick={() => setView("savings")} className="relative">
            <ChevronRight size={12} color="#D8C4B8" className="absolute top-2 right-2 z-10" />
            <Card className="py-4 flex flex-col items-center gap-2">
              <Ring pct={savePct} color="#2EC4B6">
                <span className="text-[13px] font-bold text-ink">{Math.round(savePct)}%</span>
              </Ring>
              <span className="text-[11px] font-semibold text-mauve">Sparande</span>
            </Card>
          </button>
        </div>

        {/* no-spend day */}
        <button
          onClick={logNoSpendDay}
          disabled={noSpendLoggedToday}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 mb-4"
          style={{ background: noSpendLoggedToday ? "#F3E9DE" : "#EAFBF8", border: `1px solid ${noSpendLoggedToday ? "#F3E9DE" : "#C7F0E9"}` }}
        >
          <span className="text-[13px]">🌱</span>
          <span className="text-[12px] font-bold" style={{ color: noSpendLoggedToday ? "#B08D7A" : "#1F9E90" }}>
            {noSpendLoggedToday ? "No-spend dag loggad idag ✓" : "Logga no-spend dag (+20 XP)"}
          </span>
        </button>

        {/* XP bar */}
        <Card className="p-4 mb-4 relative">
          <Confetti show={celebrate} />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} color="#FF6B5B" />
              <span className="text-[13px] font-bold text-ink">Nivå {state.level}</span>
              <button onClick={() => setShowXpInfo((v) => !v)} className="h-4 w-4 rounded-full flex items-center justify-center bg-sand" aria-label="Hur funkar XP?">
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
              style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #FF6B5B, #FFB627)", transition: "width 500ms ease-out" }}
            />
          </div>
          {showXpInfo && (
            <div className="mt-3 pt-3 space-y-1.5 border-t border-sand">
              <p className="text-[11px] font-semibold mb-1 text-ink">Så tjänar du XP</p>
              <p className="text-[11px] text-mauve">🌱 No-spend dag · +20 XP</p>
              <p className="text-[11px] text-mauve">🐷 Sparinsättning · +10 XP</p>
              <p className="text-[11px] text-mauve">📉 Betala av ett lån · +15 XP</p>
              <p className="text-[11px] text-mauve">✅ Klara en budgetperiod · +50 XP</p>
            </div>
          )}
        </Card>

        {/* purchases */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-bold text-ink">Transaktioner {periodPhrase(state.budgetPeriod, viewOffset)}</h2>
          <span className="text-[12px] font-medium text-mauve">
            -{viewedSpent.toLocaleString("sv-SE")} kr
            {viewedExtraIncome > 0 ? ` · +${viewedExtraIncome.toLocaleString("sv-SE")} kr` : ""}
          </span>
        </div>
        <Card className="overflow-hidden mb-4">
          {viewedPurchases.length === 0 && (
            <p className="text-[13px] p-4 text-mauve">
              {viewOffset === 1 ? `Inget planerat ${periodPhrase(state.budgetPeriod, viewOffset)} än.` : `Inga transaktioner ${periodPhrase(state.budgetPeriod, viewOffset)}.`}
            </p>
          )}
          {viewedPurchases.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #F3E9DE" }}>
              <div className="flex items-center gap-2">
                {p.category && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PURCHASE_CATEGORY_COLORS[p.category] || "#C9AFC2" }} />}
                <span className="text-[14px] font-medium text-ink">{p.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold" style={{ color: p.type === "income" ? "#2EC4B6" : "#241623" }}>
                  {p.type === "income" ? "+" : "-"}
                  {p.amount.toLocaleString("sv-SE")} kr
                </span>
                {viewOffset !== -1 && (
                  <button onClick={() => removePurchase(p.id)} aria-label="Ta bort">
                    <X size={14} color="#D8C4B8" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>

        {incomeSuggestion && (
          <Card className="p-4 mb-4 bg-[#EAFBF8]" style={{ borderColor: "#C7F0E9" }}>
            <p className="text-[13px] font-semibold mb-2 text-ink">Extra inkomst upptäckt — vill du spara en del?</p>
            <div className="flex gap-2">
              <button onClick={() => saveSuggestionToDeposits(Math.round(incomeSuggestion.amount * 0.5))} className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-mint text-cream">
                Spara {Math.round(incomeSuggestion.amount * 0.5).toLocaleString("sv-SE")} kr
              </button>
              <button onClick={() => saveSuggestionToDeposits(incomeSuggestion.amount)} className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-ink text-cream">
                Spara allt
              </button>
              <button onClick={() => setIncomeSuggestion(null)} className="rounded-xl px-3 py-2 text-[12px] font-bold bg-white text-mauve border border-sand">
                Nej
              </button>
            </div>
          </Card>
        )}

        {/* fixed expenses row */}
        {viewOffset !== -1 && (
          <button onClick={() => setView("fixed")} className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-4 bg-peach border border-peachline">
            <span className="text-[13px] font-semibold text-ink">
              Inkomst och fasta utgifter{viewOffset === 1 ? " · nästa period" : ""}
            </span>
            <ChevronRight size={16} color="#B08D7A" />
          </button>
        )}

        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={exportBackup} className="text-[11px] font-bold text-mint">
            Exportera backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-mint">
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
                window.alert(ok ? "Data återställd från backup!" : "Kunde inte läsa filen — är det en giltig Bloom Budget-backup?");
              }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => {
              if (window.confirm("Rensa all data i appen? Går inte att ångra.")) reset();
            }}
            className="text-[11px] font-medium text-dust"
          >
            Rensa all data
          </button>
        </div>

        {!showAdd && viewOffset !== -1 && (
          <button onClick={() => setShowAdd(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg bg-coral">
            <Plus size={18} color="#FFF9F4" />
            <span className="text-[14px] font-bold text-cream">{viewOffset === 1 ? "Planera transaktion" : "Lägg till transaktion"}</span>
          </button>
        )}

        {showAdd && (
          <div className="fixed inset-0 flex items-end justify-center z-10" style={{ background: "rgba(36,22,35,0.45)" }} onClick={() => setShowAdd(false)}>
            <div className="bloom-pop w-full max-w-sm rounded-t-3xl p-5 pb-8 bg-cream" onClick={(e) => e.stopPropagation()}>
              <div className="h-1 w-10 rounded-full mx-auto mb-4 bg-sand" />
              <h3 className="font-display text-lg font-bold mb-3 text-ink">{viewOffset === 1 ? "Planerad transaktion" : "Ny transaktion"}</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDraftType("expense")}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-bold border border-sand"
                  style={{ background: draftType === "expense" ? "#241623" : "#FFFFFF", color: draftType === "expense" ? "#FFF9F4" : "#241623" }}
                >
                  Köp
                </button>
                <button
                  onClick={() => setDraftType("income")}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-bold border border-sand"
                  style={{ background: draftType === "income" ? "#2EC4B6" : "#FFFFFF", color: draftType === "income" ? "#FFF9F4" : "#241623" }}
                >
                  Extra inkomst
                </button>
              </div>
              <input
                autoFocus
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder={draftType === "income" ? "Varifrån kommer pengarna?" : "Vad köpte du?"}
                className="w-full rounded-xl px-4 py-3 mb-2 text-[14px] outline-none bg-white border border-sand text-ink"
              />
              <input
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                placeholder="Belopp (kr)"
                inputMode="decimal"
                className="w-full rounded-xl px-4 py-3 mb-2 text-[14px] outline-none bg-white border border-sand text-ink"
              />
              {draftType === "expense" && (
                <div className="flex gap-2 mb-4">
                  {Object.keys(PURCHASE_CATEGORY_COLORS).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDraftCategory(cat)}
                      className="flex-1 rounded-xl py-2 text-[11px] font-semibold border border-sand"
                      style={{ background: draftCategory === cat ? "#241623" : "#FFFFFF", color: draftCategory === cat ? "#FFF9F4" : "#241623" }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={addPurchase}
                className="w-full rounded-xl py-3 text-[14px] font-bold text-cream"
                style={{ background: draftType === "income" ? "#2EC4B6" : "#FF6B5B" }}
              >
                Lägg till
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

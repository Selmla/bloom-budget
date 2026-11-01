"use client";
import { ReactNode, useState } from "react";
import { AppState, SavingsDeposit } from "../lib/types";
import { money, newId, parseAmount, validDate } from "../lib/money";
import { todayISO } from "../lib/dates";
import { Card, Modal, Ring, inputClass, primaryClass } from "./ui";

export function SavingsView({
  state,
  onChangeGoal,
  onAdd,
  onRemove,
  onBack,
  notice,
}: {
  state: AppState;
  onChangeGoal: (
    name: string,
    goal: number,
    date: string,
    monthly: number,
  ) => void;
  onAdd: (item: SavingsDeposit) => void;
  onRemove: (id: number) => void;
  onBack: () => void;
  notice?: ReactNode;
}) {
  const [dialog, setDialog] = useState<"goal" | "deposit" | null>(null);
  const [name, setName] = useState(state.savingsGoalName);
  const [goal, setGoal] = useState(String(state.savingsGoal));
  const [target, setTarget] = useState(state.savingsTargetDate);
  const [monthly, setMonthly] = useState(String(state.monthlyContribution));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("transfer");
  const [error, setError] = useState("");
  const current = money(
    state.savingsDeposits.reduce((s, e) => s + e.amount, 0),
  );
  const hasGoal = state.savingsGoal > 0;
  const left = Math.max(0, money(state.savingsGoal - current));
  const pct = hasGoal ? Math.min(100, (current / state.savingsGoal) * 100) : 0;
  const monthStart = todayISO().slice(0, 7) + "-01";
  const thisMonth = money(
    state.savingsDeposits
      .filter(
        (e) =>
          e.kind === "transfer" &&
          e.date &&
          e.date >= monthStart &&
          e.date <= todayISO(),
      )
      .reduce((s, e) => s + e.amount, 0),
  );
  const months =
    state.monthlyContribution > 0
      ? Math.ceil(left / state.monthlyContribution)
      : null;
  const projected =
    months === null
      ? null
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth() + months,
          1,
        ).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const milestone =
    hasGoal && current > 0
      ? pct >= 100
        ? "Målet är nått! 🌸"
        : pct >= 50
          ? "Du har nått halva målet 🌱"
          : current >= 1000
            ? "Du har byggt upp minst 1 000 kr 🌱"
            : "Varje insättning bygger ditt sparande 🌱"
      : "";
  function close() {
    setDialog(null);
    setError("");
  }
  function saveDeposit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!validDate(date) || date > todayISO()) {
      setError("Välj ett giltigt datum, senast idag.");
      return;
    }
    if (
      !Number.isFinite(value) ||
      value === 0 ||
      (mode !== "adjustment" && value < 0)
    ) {
      setError(
        "Ange ett giltigt belopp. Använd positivt belopp för överföring och uttag.",
      );
      return;
    }
    try {
      onAdd({
        id: newId(),
        label: label.trim(),
        amount: mode === "withdrawal" ? -value : value,
        date,
        kind: mode === "adjustment" ? "adjustment" : "transfer",
      });
      close();
      setAmount("");
      setLabel("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="w-full max-w-sm mx-auto px-5 pt-8 pb-28 text-ink">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} aria-label="Tillbaka" className="px-3 py-2">
          ←
        </button>
        <h1 className="font-display text-2xl font-bold">Sparande</h1>
      </div>
      {notice}
      <Card className="p-5 mb-4">
        <p className="text-sm">{state.savingsGoalName}</p>
        <p className="font-display text-4xl font-bold">
          {current.toLocaleString("sv-SE")} kr
        </p>
        <p className="text-sm mt-2">
          {hasGoal
            ? "av " + state.savingsGoal.toLocaleString("sv-SE") + " kr"
            : "Sätt ett mål som betyder något för dig"}
        </p>
        <button
          className="mt-3 underline"
          onClick={() => {
            setDialog("goal");
            setName(state.savingsGoalName);
            setGoal(String(state.savingsGoal));
            setMonthly(String(state.monthlyContribution));
            setTarget(state.savingsTargetDate);
          }}
        >
          Ändra sparmål
        </button>
      </Card>
      <Card className="p-4 mb-4 flex gap-4 items-center">
        <Ring pct={pct} color="#2EC4B6" size={72}>
          <span>{Math.round(pct)}%</span>
        </Ring>
        <div>
          <p>
            {hasGoal
              ? left.toLocaleString("sv-SE") + " kr kvar till målet"
              : "Inget mål valt ännu"}
          </p>
          <p className="text-sm mt-1">{milestone}</p>
        </div>
      </Card>
      <Card className="p-4 mb-4">
        <p className="font-bold">Faktiskt sparat denna kalendermånad</p>
        <p className="text-xl font-bold my-1">
          {thisMonth.toLocaleString("sv-SE")} kr netto
        </p>
        <p className="text-sm">
          Plan: {state.monthlyContribution.toLocaleString("sv-SE")} kr/mån
        </p>
        <p className="text-sm mt-2">
          {!hasGoal
            ? "Välj ett mål för att se en prognos."
            : left === 0
              ? "Du har nått ditt mål!"
              : projected
                ? "Med det planerade månadsbeloppet når du målet omkring " +
                  projected +
                  "."
                : "Välj ett månadsbelopp för att se en prognos."}
        </p>
        {state.savingsTargetDate && (
          <p className="text-sm mt-1">
            Önskat måldatum: {state.savingsTargetDate}
          </p>
        )}
        <p className="text-xs mt-2 text-mauve">
          Prognosen utgår från din plan, utan ränta eller avkastning. Faktiskt
          sparande visar överföringar minus uttag.
        </p>
      </Card>
      <h2 className="font-bold mb-2">Sparhistorik</h2>
      <Card className="p-4 mb-4">
        {state.savingsDeposits.length === 0 && (
          <p>
            Din första insättning kan vara liten. Välj ett belopp som fungerar
            för dig.
          </p>
        )}
        {[...state.savingsDeposits].reverse().map((item) => (
          <div key={item.id} className="border-b border-sand py-3">
            <div className="flex justify-between gap-2">
              <span>{item.label}</span>
              <strong>{item.amount.toLocaleString("sv-SE")} kr</strong>
            </div>
            <p className="text-xs mt-1">
              {item.date || "Äldre post utan datum"} ·{" "}
              {item.kind === "transfer"
                ? item.amount < 0
                  ? "Tillbaka till budgeten"
                  : "Från budgeten"
                : "Ingående saldo / rättelse · påverkar inte budgeten"}
            </p>
            <button
              aria-label={"Ta bort " + item.label}
              className="text-sm underline mt-1"
              onClick={() => {
                try {
                  onRemove(item.id);
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Ta bort
            </button>
          </div>
        ))}
      </Card>
      {error && !dialog && (
        <p role="alert" className="mb-4">
          {error}
        </p>
      )}
      <button
        className={primaryClass + " w-full"}
        onClick={() => {
          setDialog("deposit");
          setDate(todayISO());
          setError("");
        }}
      >
        Registrera sparhändelse
      </button>
      {dialog === "goal" && (
        <Modal title="Ditt sparmål" onClose={close}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const g = parseAmount(goal),
                m = parseAmount(monthly);
              if (
                !name.trim() ||
                !Number.isFinite(g) ||
                g < 0 ||
                !Number.isFinite(m) ||
                m < 0 ||
                (target && !validDate(target))
              ) {
                setError("Ange ett namn och giltiga belopp, minst 0 kr.");
                return;
              }
              onChangeGoal(name.trim(), g, target, m);
              close();
            }}
          >
            <label className="block">
              Namn på målet
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Målbelopp (kr)
              <input
                className={inputClass}
                inputMode="decimal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Planerat sparande per månad (kr)
              <input
                className={inputClass}
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Önskat måldatum (valfritt)
              <input
                className={inputClass}
                type="date"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className={primaryClass}>Spara mål</button>
          </form>
        </Modal>
      )}
      {dialog === "deposit" && (
        <Modal title="Registrera sparhändelse" onClose={close}>
          <form onSubmit={saveDeposit} className="space-y-3">
            <label className="block">
              Typ av händelse
              <select
                className={inputClass}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="transfer">
                  Flytta från budget till sparande
                </option>
                <option value="withdrawal">Ta ut till budgeten</option>
                <option value="adjustment">Ingående saldo / rättelse</option>
              </select>
            </label>
            <p className="text-sm">
              {mode === "adjustment"
                ? "Ändrar bara sparsaldo. Ange minus för att minska saldot."
                : "Uppdaterar både sparandet och budgeten för det valda datumet. Registrera inte samma belopp som ett köp."}
            </p>
            <label className="block">
              Beskrivning
              <input
                className={inputClass}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Belopp (kr)
              <input
                className={inputClass}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Datum
              <input
                className={inputClass}
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className={primaryClass}>Spara händelse</button>
          </form>
        </Modal>
      )}
    </main>
  );
}

"use client";
import { useState } from "react";
import { AppState, FixedExpense } from "../lib/types";
import { newId, parseAmount } from "../lib/money";
import { periodBounds, toISO, todayISO } from "../lib/dates";
import { Card, inputClass, primaryClass } from "./ui";

export function IntroScreen({
  onComplete,
}: {
  onComplete: (patch: Partial<AppState>) => void;
}) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState("0");
  const [day, setDay] = useState("1");
  const [fixed, setFixed] = useState<FixedExpense[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [goalName, setGoalName] = useState("Min trygghetsbuffert");
  const [goal, setGoal] = useState("0");
  const [loanName, setLoanName] = useState("");
  const [loanBalance, setLoanBalance] = useState("");
  const [error, setError] = useState("");
  function finish() {
    const i = parseAmount(income),
      g = parseAmount(goal),
      bal = loanName.trim() ? parseAmount(loanBalance) : 0;
    if (
      ![i, g, bal].every((n) => Number.isFinite(n) && n >= 0) ||
      !goalName.trim()
    ) {
      setError("Kontrollera mål och lånesaldo. Belopp ska vara minst 0 kr.");
      return;
    }
    const startDay = Number(day);
    const [start, end] = periodBounds(new Date(), "month", startDay);
    onComplete({
      hasOnboarded: true,
      income: i,
      fixed,
      budgetStartDay: startDay,
      savingsGoalName: goalName.trim(),
      savingsGoal: g,
      cycleAnchorDate: toISO(start),
      cycleEndDate: toISO(end),
      periodPlans: {
        ["month:" + toISO(start)]: { income: i, fixed, override: null },
      },
      loans: loanName.trim()
        ? [
            {
              id: newId(),
              label: loanName.trim(),
              originalAmount: bal,
              currentBalance: bal,
              trackedStartingBalance: bal,
              lastUpdated: todayISO(),
            },
          ]
        : [],
    });
  }
  return (
    <main data-bloom-editor className="max-w-sm mx-auto px-5 py-10 text-ink">
      <p className="text-4xl mb-3">🌸</p>
      <h1 className="font-display text-3xl font-bold mb-3">Bloom Budget</h1>
      <p className="text-sm mb-5">
        Skapa din första plan i tre steg. Alla uppgifter sparas bara på den här
        enheten. Du kan ändra dem senare.
      </p>
      <p className="font-bold mb-4">Steg {step + 1} av 3</p>
      {step === 0 && (
        <Card className="p-4 space-y-4">
          <h2 className="font-bold">Din månadsinkomst</h2>
          <label className="block">
            Inkomst efter skatt (kr)
            <input
              className={inputClass}
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </label>
          <label className="block">
            Budgetmånaden börjar den
            <select
              className={inputClass}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {Array.from({ length: 28 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm">
            Välj till exempel dagen då lönen eller ersättningen kommer.
          </p>
        </Card>
      )}
      {step === 1 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-bold">Dina fasta utgifter</h2>
          <p className="text-sm">
            Lägg till exempelvis hyra och räkningar. Steget går att hoppa över.
          </p>
          {fixed.map((e) => (
            <div className="flex justify-between items-center gap-2" key={e.id}>
              <span>
                {e.label} · {e.amount.toLocaleString("sv-SE")} kr
              </span>
              <button
                className="underline p-2"
                aria-label={"Ta bort " + e.label}
                onClick={() => setFixed(fixed.filter((f) => f.id !== e.id))}
              >
                Ta bort
              </button>
            </div>
          ))}
          <label className="block">
            Utgiftens namn
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="block">
            Belopp per månad (kr)
            <input
              className={inputClass}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button
            className="underline font-bold py-2"
            onClick={() => {
              const val = parseAmount(amount);
              if (!label.trim() || !Number.isFinite(val) || val <= 0) {
                setError("Ange namn och belopp över 0 kr.");
                return;
              }
              setFixed([
                ...fixed,
                {
                  id: newId(),
                  label: label.trim(),
                  amount: val,
                  category: "Övrigt",
                },
              ]);
              setLabel("");
              setAmount("");
              setError("");
            }}
          >
            Lägg till utgift
          </button>
        </Card>
      )}
      {step === 2 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-bold">Mål och lån (valfritt)</h2>
          <label className="block">
            Vad vill du spara till?
            <input
              className={inputClass}
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
            />
          </label>
          <label className="block">
            Målbelopp (kr, 0 om du vill vänta)
            <input
              className={inputClass}
              inputMode="decimal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          <label className="block">
            Namn på ett lån (valfritt)
            <input
              className={inputClass}
              value={loanName}
              onChange={(e) => setLoanName(e.target.value)}
            />
          </label>
          <label className="block">
            Lånets saldo idag (kr)
            <input
              className={inputClass}
              inputMode="decimal"
              value={loanBalance}
              onChange={(e) => setLoanBalance(e.target.value)}
            />
          </label>
          <p className="text-sm">
            Fler lån och detaljer kan du lägga till senare.
          </p>
        </Card>
      )}
      {error && (
        <p role="alert" className="my-4">
          {error}
        </p>
      )}
      <div className="flex gap-3 mt-5">
        {step > 0 && (
          <button
            className="px-3 py-3 underline"
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            Tillbaka
          </button>
        )}
        <button
          className={primaryClass + " flex-1"}
          onClick={() => {
            if (step === 2) {
              finish();
              return;
            }
            const val = parseAmount(income);
            if (!Number.isFinite(val) || val < 0) {
              setError("Ange en giltig inkomst, minst 0 kr.");
              return;
            }
            if (step === 1 && (label.trim() || amount.trim())) {
              setError(
                "Lägg till den påbörjade utgiften eller töm fälten först.",
              );
              return;
            }
            setError("");
            setStep(step + 1);
          }}
        >
          {step === 2 ? "Skapa min budget" : "Nästa"}
        </button>
      </div>
    </main>
  );
}

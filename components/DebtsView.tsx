"use client";
import { ReactNode, useState } from "react";
import { AppState, Loan, DebtEvent } from "../lib/types";
import { daysSince, todayISO } from "../lib/dates";
import { money, newId, parseAmount } from "../lib/money";
import { Card, Modal, Ring, inputClass, primaryClass } from "./ui";

export function DebtsView({
  state,
  onSaveLoan,
  onRecord,
  onArchive,
  onReminder,
  onBack,
  notice,
}: {
  state: AppState;
  onSaveLoan: (loan: Loan) => void;
  onRecord: (
    event: Omit<DebtEvent, "before" | "after"> & { balance?: number },
  ) => void;
  onArchive: (id: number, archived: boolean) => void;
  onReminder: (days: number) => void;
  onBack: () => void;
  notice?: ReactNode;
}) {
  const [dialog, setDialog] = useState<
    "loan" | "payment" | "correction" | null
  >(null);
  const [selected, setSelected] = useState<Loan | null>(null);
  const [label, setLabel] = useState("");
  const [original, setOriginal] = useState("");
  const [balance, setBalance] = useState("");
  const [principal, setPrincipal] = useState("");
  const [fees, setFees] = useState("0");
  const [date, setDate] = useState(todayISO());
  const [included, setIncluded] = useState(false);
  const [error, setError] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const total = money(state.loans.reduce((s, l) => s + l.currentBalance, 0));
  const starting = money(
    state.loans.reduce(
      (s, l) => s + (l.trackedStartingBalance ?? l.currentBalance),
      0,
    ),
  );
  const reduction = money(starting - total);
  const pct =
    starting > 0 ? Math.max(0, Math.min(100, (reduction / starting) * 100)) : 0;
  function open(
    mode: "loan" | "payment" | "correction",
    loan: Loan | null = null,
  ) {
    setSelected(loan);
    setDialog(mode);
    setLabel(loan?.label || "");
    setOriginal(loan ? String(loan.originalAmount) : "");
    setBalance(loan ? String(loan.currentBalance) : "");
    setPrincipal("");
    setFees("0");
    setDate(todayISO());
    setIncluded(false);
    setError("");
  }
  function close() {
    setDialog(null);
    setError("");
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (dialog === "loan") {
        const orig = parseAmount(original),
          bal = parseAmount(balance);
        if (
          !label.trim() ||
          !Number.isFinite(orig) ||
          orig <= 0 ||
          !Number.isFinite(bal) ||
          bal < 0
        )
          throw new Error(
            "Ange namn, ursprungligt lånebelopp och ett giltigt saldo.",
          );
        onSaveLoan(
          selected
            ? { ...selected, label: label.trim(), originalAmount: orig }
            : {
                id: newId(),
                label: label.trim(),
                originalAmount: orig,
                currentBalance: bal,
                lastUpdated: todayISO(),
                trackedStartingBalance: bal,
              },
        );
      } else {
        if (!selected || date > todayISO())
          throw new Error("Välj ett datum senast idag.");
        onRecord({
          id: newId(),
          loanId: selected.id,
          date,
          kind: dialog === "payment" ? "payment" : "correction",
          principal: dialog === "payment" ? parseAmount(principal) : 0,
          fees: dialog === "payment" ? parseAmount(fees) : 0,
          includedInFixed: included,
          balance: parseAmount(balance),
        });
      }
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="w-full max-w-sm mx-auto px-5 pt-8 pb-28 text-ink">
      <div className="flex gap-3 items-center mb-5">
        <button onClick={onBack} aria-label="Tillbaka" className="px-3 py-2">
          ←
        </button>
        <h1 className="font-display text-2xl font-bold">Skulder</h1>
      </div>
      {notice}
      <Card className="p-5 mb-4">
        <p>Skuld kvar totalt</p>
        <p className="font-display text-4xl font-bold">
          {total.toLocaleString("sv-SE")} kr
        </p>
        <p className="text-sm mt-2">
          {reduction >= 0
            ? reduction.toLocaleString("sv-SE") + " kr lägre"
            : Math.abs(reduction).toLocaleString("sv-SE") + " kr högre"}{" "}
          än första registrerade saldon
        </p>
      </Card>
      {starting > 0 && (
        <Card className="p-4 mb-4 flex gap-3 items-center">
          <Ring pct={pct} color="#FFB627" size={72}>
            <span>{Math.round(pct)}%</span>
          </Ring>
          <p>
            {total === 0
              ? "Alla registrerade lån är betalda! 🌸"
              : "Varje amortering minskar det som är kvar."}
          </p>
        </Card>
      )}
      <Card className="p-4 mb-4">
        <label className="block font-semibold">
          Kontrollera saldon efter
          <select
            className={inputClass}
            aria-label="Intervall för saldokontroll"
            value={state.debtReminderDays}
            onChange={(e) => onReminder(Number(e.target.value))}
          >
            <option value={30}>30 dagar</option>
            <option value={60}>60 dagar</option>
          </select>
        </label>
        <p className="text-xs mt-2">
          Påminnelsen visas här i appen. Inga bankuppgifter hämtas automatiskt.
        </p>
      </Card>
      <h2 className="font-bold mb-2">Dina lån</h2>
      {state.loans.length === 0 && (
        <Card className="p-4 mb-4">
          Lägg till ett lån och dagens saldo för att börja följa minskningen.
        </Card>
      )}
      {state.loans
        .filter((l) => !!l.archived === showArchive)
        .map((loan) => (
          <Card key={loan.id} className="p-4 mb-3">
            <div className="flex justify-between gap-2">
              <strong>{loan.label}</strong>
              <strong>{loan.currentBalance.toLocaleString("sv-SE")} kr</strong>
            </div>
            <p className="text-xs mt-2">
              Första registrerade saldo:{" "}
              {(
                loan.trackedStartingBalance ?? loan.currentBalance
              ).toLocaleString("sv-SE")}{" "}
              kr · Ursprungligt lån:{" "}
              {loan.originalAmount.toLocaleString("sv-SE")} kr
            </p>
            <p className="text-sm mt-2">
              Senast kontrollerat {loan.lastUpdated}
              {!loan.archived &&
              state.reminderEnabled &&
              daysSince(loan.lastUpdated) >= state.debtReminderDays
                ? " · Dags att stämma av"
                : ""}
            </p>
            {!loan.archived && (
              <div className="flex flex-wrap gap-2 mt-3">
                {loan.currentBalance > 0 && (
                  <button
                    className={primaryClass}
                    onClick={() => open("payment", loan)}
                  >
                    Registrera betalning
                  </button>
                )}
                <button
                  className="underline text-sm px-2 py-2"
                  onClick={() => open("correction", loan)}
                >
                  Korrigera saldo
                </button>
                <button
                  className="underline text-sm px-2 py-2"
                  onClick={() => open("loan", loan)}
                >
                  Ändra lånets namn/belopp
                </button>
              </div>
            )}
            {loan.currentBalance === 0 && (
              <button
                className="underline text-sm mt-3"
                onClick={() => onArchive(loan.id, !loan.archived)}
              >
                {loan.archived
                  ? "Visa bland aktiva"
                  : "Arkivera färdigbetalt lån"}
              </button>
            )}
          </Card>
        ))}
      <button
        className="underline py-3 mb-3"
        onClick={() => setShowArchive(!showArchive)}
      >
        {showArchive ? "Visa aktiva lån" : "Visa arkiv"}
      </button>
      <button
        className={primaryClass + " w-full mb-5"}
        onClick={() => open("loan")}
      >
        Lägg till lån
      </button>
      <h2 className="font-bold mb-2">Skuldhistorik</h2>
      <Card className="p-4">
        {state.debtEvents.length === 0 && (
          <p className="text-sm">
            Betalningar och saldokorrigeringar visas här när du registrerar dem.
          </p>
        )}
        {[...state.debtEvents].reverse().map((event) => (
          <div className="border-b border-sand py-3" key={event.id}>
            <p className="font-semibold">
              {state.loans.find((l) => l.id === event.loanId)?.label || "Lån"} ·{" "}
              {event.kind === "payment" ? "Betalning" : "Saldokorrigering"}
            </p>
            <p className="text-sm">
              {event.date} · {event.before.toLocaleString("sv-SE")} →{" "}
              {event.after.toLocaleString("sv-SE")} kr
            </p>
            {event.kind === "payment" && (
              <p className="text-xs mt-1">
                Amortering {event.principal.toLocaleString("sv-SE")} kr ·
                ränta/avgifter {event.fees.toLocaleString("sv-SE")} kr ·{" "}
                {event.includedInFixed
                  ? "Redan i fasta utgifter"
                  : "Dragen från budgeten"}
              </p>
            )}
          </div>
        ))}
      </Card>
      {dialog && (
        <Modal
          title={
            dialog === "loan"
              ? selected
                ? "Ändra lånets uppgifter"
                : "Lägg till lån"
              : dialog === "payment"
                ? "Registrera lånebetalning"
                : "Korrigera saldo"
          }
          onClose={close}
        >
          <form className="space-y-3" onSubmit={save}>
            {dialog === "loan" ? (
              <>
                <label className="block">
                  Lånets namn
                  <input
                    className={inputClass}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  Ursprungligt lånebelopp (kr)
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={original}
                    onChange={(e) => setOriginal(e.target.value)}
                    required
                  />
                </label>
                {!selected && (
                  <label className="block">
                    Saldo idag (kr)
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      required
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">{selected?.label}</p>
                {dialog === "payment" ? (
                  <>
                    <label className="block">
                      Amortering (kr)
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={principal}
                        onChange={(e) => setPrincipal(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      Ränta och avgifter (kr)
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        required
                      />
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={(e) => setIncluded(e.target.checked)}
                      />
                      Hela betalningen ingår redan i fasta utgifter för perioden
                    </label>
                    <p className="text-xs">
                      Amorteringen minskar skulden. Om betalningen redan ingår i
                      fasta utgifter dras den inte igen. Registrera inte samma
                      betalning som ett separat köp.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="block">
                      Rätt saldo (kr)
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        required
                      />
                    </label>
                    <p className="text-sm">
                      Detta rättar saldot. Ingen betalning dras från budgeten
                      och ingen XP delas ut.
                    </p>
                  </>
                )}
                <label className="block">
                  Datum
                  <input
                    className={inputClass}
                    type="date"
                    min={selected?.lastUpdated}
                    max={todayISO()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button className={primaryClass}>Spara</button>
          </form>
        </Modal>
      )}
    </main>
  );
}

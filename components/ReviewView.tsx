"use client";
import { ReactNode, useState } from "react";
import { AppState } from "../lib/types";
import { summarize } from "../lib/reviews";
import { ensurePlans, readPlan } from "../lib/plans";
import { cycleRangeLabel, todayISO } from "../lib/dates";
import { Card, primaryClass } from "./ui";

export function ReviewView({
  state,
  from,
  end,
  onBack,
  onConfirm,
  onNext,
  notice,
}: {
  state: AppState;
  from: string;
  end: string;
  onBack: () => void;
  onConfirm: () => void;
  onNext: () => void;
  notice?: ReactNode;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const summary = summarize(state, from, end);
  const review = state.reviews[state.budgetPeriod + ":" + from];
  const valid = review?.signature === summary.signature;
  const nextPlan = readPlan(ensurePlans(state, end), end);
  const finished = end <= todayISO();
  return (
    <main className="max-w-sm mx-auto px-5 pt-8 pb-24 text-ink">
      <div className="flex gap-3 items-center mb-5">
        <button onClick={onBack} aria-label="Tillbaka" className="p-3">
          ←
        </button>
        <h1 className="font-display text-2xl font-bold">Stäm av perioden</h1>
      </div>
      {notice}
      <p className="mb-4">
        {cycleRangeLabel(from, end)} ·{" "}
        {finished ? "Avslutad period" : "Pågående period"}
      </p>
      <Card className="p-4 mb-4 space-y-2">
        <p>
          Budget för rörliga belopp:{" "}
          <strong>{summary.budget.toLocaleString("sv-SE")} kr</strong>
        </p>
        <p>Registrerade köp: {summary.spent.toLocaleString("sv-SE")} kr</p>
        <p>Extra inkomst: {summary.income.toLocaleString("sv-SE")} kr</p>
        <p>
          Till sparande: {summary.movements.savings.toLocaleString("sv-SE")} kr
          netto
        </p>
        <p>
          Lånebetalningar utöver fasta utgifter:{" "}
          {summary.movements.debt.toLocaleString("sv-SE")} kr
        </p>
        <p>
          Registrerad amortering: {summary.principal.toLocaleString("sv-SE")} kr
        </p>
        <p className="font-bold">
          Kvar enligt budget: {summary.remaining.toLocaleString("sv-SE")} kr
        </p>
      </Card>
      <p className="text-sm mb-4">
        {summary.remaining < 0
          ? "Det blev mer än planerat. En avstämning hjälper dig att göra nästa plan rimligare; tidigare framsteg finns kvar."
          : "Kontrollera uppgifterna innan du bedömer hur månaden gick."}
      </p>
      <label className="flex gap-3 mb-4 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Jag har jämfört med mina konton och lagt in saknade köp,
        sparöverföringar och betalningar.
      </label>
      <button
        disabled={!confirmed}
        onClick={onConfirm}
        className={primaryClass + " w-full disabled:opacity-40"}
      >
        Bekräfta avstämning
      </button>
      <p role="status" className="text-sm my-3">
        {valid
          ? "Uppgifterna är avstämda " + review.reviewedAt + "."
          : review
            ? "Uppgifterna har ändrats sedan senaste avstämningen."
            : "Perioden är inte avstämd ännu."}
      </p>
      <p className="text-xs mb-4">
        {finished
          ? "En avslutad period ger +20 XP när du stämmer av den, om XP är aktiverat. Belöningen ges en gång oavsett resultat."
          : "Det här är en kontroll under perioden. En slutlig avstämning kan göras efter periodens slut."}
      </p>
      <Card className="p-4">
        <h2 className="font-bold mb-2">Förbered nästa plan</h2>
        <p className="text-sm">
          Inkomst {nextPlan.income.toLocaleString("sv-SE")} kr · fasta utgifter{" "}
          {nextPlan.fixed
            .reduce((s, e) => s + e.amount, 0)
            .toLocaleString("sv-SE")}{" "}
          kr.
        </p>
        <p className="text-xs mt-2">
          En befintlig plan bevaras. En ny plan kopieras från föregående period.
        </p>
        <button className="underline font-semibold mt-3" onClick={onNext}>
          Öppna och kontrollera nästa plan
        </button>
      </Card>
    </main>
  );
}

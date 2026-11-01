"use client";

import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, Ring } from "./ui";
import { BudgetPeriod } from "../lib/types";
import { WEEKS_PER_MONTH } from "../lib/dates";

export function BudgetView({
  showSettings = true,
  readOnly = false,
  periodLabel = "",
  period,
  setPeriod,
  startDay,
  setStartDay,
  income,
  fixedTotal,
  override,
  setOverride,
  budgetPlanned,
  spent,
  extraIncome,
  periodEndDate,
  onBack,
}: {
  showSettings?: boolean;
  readOnly?: boolean;
  periodLabel?: string;
  period: BudgetPeriod;
  setPeriod: (p: BudgetPeriod) => void;
  startDay: number;
  setStartDay: (n: number) => void;
  income: number;
  fixedTotal: number;
  override: number | null;
  setOverride: (n: number | null) => void;
  budgetPlanned: number;
  spent: number;
  extraIncome: number;
  periodEndDate: string | null;
  onBack: () => void;
}) {
  // `override` is always stored as a monthly-equivalent amount so it survives
  // switching between week/month without silently over- or under-stating the budget.
  const overrideForPeriod = (val: number) => (period === "week" ? Math.round(val / WEEKS_PER_MONTH) : val);
  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState(override !== null ? String(overrideForPeriod(override)) : "");
  const [startDayDraft, setStartDayDraft] = useState(String(startDay));
  const monthlyAuto = income - fixedTotal;
  const autoAmount = period === "week" ? Math.round(monthlyAuto / WEEKS_PER_MONTH) : monthlyAuto;
  const netSpent = spent - extraIncome;
  const remainingPct = budgetPlanned > 0 ? Math.max(0, Math.min(100, 100 - (netSpent / budgetPlanned) * 100)) : 0;

  function saveStartDay(val: number) {
    const day = Math.max(1, Math.min(28, val));
    setStartDay(day);
    setStartDayDraft(String(day));
  }

  function saveOverride() {
    const val = parseFloat(overrideDraft);
    if (!val || val <= 0) return;
    setOverride(period === "week" ? Math.round(val * WEEKS_PER_MONTH) : val);
    setEditingOverride(false);
  }

  function useAuto() {
    setOverride(null);
    setEditingOverride(false);
  }

  return (
    <div className="w-full max-w-sm px-5 pt-8 pb-24 relative mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-sand" aria-label="Tillbaka">
          <ArrowLeft size={16} color="#241623" />
        </button>
        <h1 className="font-display text-2xl font-bold text-ink">Budget</h1>
      </div>
      <p className="text-[12px] font-semibold text-mauve mb-4">{periodLabel}</p>

      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
        <p className="text-[13px] font-medium" style={{ color: "#C9AFC2" }}>
          Kvar i vald {period === "week" ? "vecka" : "månad"}
        </p>
        <p className="font-display text-4xl font-bold mt-1 text-cream">{(budgetPlanned - netSpent).toLocaleString("sv-SE")} kr</p>
        <p className="text-[12px] mt-2" style={{ color: "#C9AFC2" }}>
          av {budgetPlanned.toLocaleString("sv-SE")} kr
        </p>
        <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-coral" />
      </div>

      <Card className="p-4 mb-4 flex items-center gap-4">
        <Ring pct={remainingPct} color="#FF6B5B" size={72} stroke={8}>
          <span className="text-[12px] font-bold text-ink">{Math.round(remainingPct)}%</span>
        </Ring>
        <div>
          <p className="text-[13px] font-semibold text-ink">{netSpent.toLocaleString("sv-SE")} kr använt</p>
          <p className="text-[11px] mt-0.5 text-mauve">av {budgetPlanned.toLocaleString("sv-SE")} kr tillgängligt</p>
        </div>
      </Card>

      {showSettings && <>
      <Card className="p-4 mb-4">
        <p className="text-[12px] font-semibold mb-3 text-mauve">Period</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("month")}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold border border-sand"
            style={{ background: period === "month" ? "#241623" : "#FFFFFF", color: period === "month" ? "#FFF9F4" : "#241623" }}
          >
            Månad
          </button>
          <button
            onClick={() => setPeriod("week")}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold border border-sand"
            style={{ background: period === "week" ? "#241623" : "#FFFFFF", color: period === "week" ? "#FFF9F4" : "#241623" }}
          >
            Vecka
          </button>
        </div>
      </Card>

      {period === "month" && (
        <Card className="p-4 mb-4">
          <p className="text-[12px] font-semibold mb-1 text-mauve">Din budgetmånad börjar den</p>
          <p className="text-[11px] mb-3 text-mauve">Får du lön den 25:e kan det kännas mer rätt att månaden också börjar då.</p>
          <div className="flex gap-2 mb-2">
            {[1, 25, 27].map((d) => (
              <button
                key={d}
                onClick={() => saveStartDay(d)}
                className="flex-1 rounded-xl py-2 text-[13px] font-bold border border-sand"
                style={{ background: startDay === d ? "#241623" : "#FFFFFF", color: startDay === d ? "#FFF9F4" : "#241623" }}
              >
                {d === 1 ? "1:a" : `${d}:e`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={startDayDraft}
              onChange={(e) => setStartDayDraft(e.target.value)}
              onBlur={() => saveStartDay(parseInt(startDayDraft, 10) || 1)}
              inputMode="numeric"
              placeholder="Eget datum (1–28)"
              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none bg-cream border border-sand text-ink"
            />
            <span className="text-[11px] text-mauve">i varje månad</span>
          </div>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <p className="text-[12px] font-semibold mb-1 text-mauve">Perioden avslutas automatiskt</p>
        <p className="text-[11px] text-mauve">
          {periodEndDate
            ? `Håller du dig inom budget till ${new Date(periodEndDate).toLocaleDateString("sv-SE", {
                day: "numeric",
                month: "long",
              })} får du +50 XP och din streak ökar — helt automatiskt.`
            : "Håll dig inom budget till periodens slut för +50 XP — helt automatiskt, inget att markera själv."}
        </p>
      </Card>

      </>}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-mauve">Hur beloppet räknas fram</p>
          {!editingOverride && !readOnly && (
            <button
              onClick={() => {
                setOverrideDraft(override !== null ? String(overrideForPeriod(override)) : String(autoAmount));
                setEditingOverride(true);
              }}
              className="flex items-center gap-1"
            >
              <Pencil size={12} color="#B08D7A" />
              <span className="text-[11px] font-semibold text-mauve">Ändra</span>
            </button>
          )}
        </div>

        {override === null ? (
          <p className="text-[12px] leading-relaxed text-ink">
            {income.toLocaleString("sv-SE")} kr inkomst − {fixedTotal.toLocaleString("sv-SE")} kr fasta utgifter
            {period === "week" ? ` ÷ ${WEEKS_PER_MONTH} veckor` : ""} = <span className="font-bold">{autoAmount.toLocaleString("sv-SE")} kr</span>
          </p>
        ) : (
          <p className="text-[12px] text-ink">
            Eget belopp: <span className="font-bold">{overrideForPeriod(override).toLocaleString("sv-SE")} kr</span>
          </p>
        )}

        {editingOverride && (
          <div className="mt-3 space-y-2">
            <input
              autoFocus
              value={overrideDraft}
              onChange={(e) => setOverrideDraft(e.target.value)}
              inputMode="decimal"
              placeholder="Eget budgetbelopp (kr)"
              className="w-full rounded-xl px-3 py-2 text-[14px] font-semibold outline-none bg-cream border border-sand text-ink"
            />
            <div className="flex gap-2">
              <button onClick={saveOverride} className="flex-1 rounded-xl py-2 text-[13px] font-bold bg-coral text-cream">
                Spara eget belopp
              </button>
              <button onClick={useAuto} className="flex-1 rounded-xl py-2 text-[13px] font-bold bg-white text-ink border border-sand">
                Räkna ut åt mig
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

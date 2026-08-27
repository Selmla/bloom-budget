"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";
import { Card, Ring } from "./ui";
import { SavingsDeposit } from "../lib/types";

export function SavingsView({
  goal,
  setGoal,
  targetDate,
  setTargetDate,
  deposits,
  setDeposits,
  monthlyContribution,
  setMonthlyContribution,
  current,
  onAwardXp,
  onBack,
}: {
  goal: number;
  setGoal: (n: number) => void;
  targetDate: string;
  setTargetDate: (s: string) => void;
  deposits: SavingsDeposit[];
  setDeposits: (d: SavingsDeposit[]) => void;
  monthlyContribution: number;
  setMonthlyContribution: (n: number) => void;
  current: number;
  onAwardXp: (n: number) => void;
  onBack: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(goal));
  const [dateDraft, setDateDraft] = useState(targetDate);

  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remainingToGoal = Math.max(0, goal - current);
  const monthsAtCurrentPace = monthlyContribution > 0 ? Math.ceil(remainingToGoal / monthlyContribution) : null;

  const projectedDate = useMemo(() => {
    if (monthsAtCurrentPace === null) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAtCurrentPace);
    return d;
  }, [monthsAtCurrentPace]);

  const monthsUntilTarget = useMemo(() => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  }, [targetDate]);

  const monthsDiff = monthsUntilTarget !== null && monthsAtCurrentPace !== null ? monthsUntilTarget - monthsAtCurrentPace : null;

  function saveGoal() {
    const val = parseFloat(goalDraft);
    if (val && val > 0) setGoal(val);
    if (dateDraft) setTargetDate(dateDraft);
    setEditingGoal(false);
  }

  function addDeposit() {
    const amt = parseFloat(draftAmount);
    if (!draftLabel.trim() || !amt) return;
    setDeposits([...deposits, { id: Date.now(), label: draftLabel.trim(), amount: amt }]);
    if (amt > 0) onAwardXp(10);
    setDraftLabel("");
    setDraftAmount("");
    setShowAdd(false);
  }

  function removeDeposit(id: number) {
    setDeposits(deposits.filter((d) => d.id !== id));
  }

  const monthLabel = (d: Date | null) => (d ? d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" }) : "");

  return (
    <div className="w-full max-w-sm px-5 pt-8 pb-24 relative mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-sand" aria-label="Tillbaka">
          <ArrowLeft size={16} color="#241623" />
        </button>
        <h1 className="font-display text-2xl font-bold text-ink">Sparande</h1>
      </div>

      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
        <p className="text-[13px] font-medium" style={{ color: "#C9AFC2" }}>
          Sparat hittills
        </p>
        <p className="font-display text-4xl font-bold mt-1 text-cream">{current.toLocaleString("sv-SE")} kr</p>
        {!editingGoal ? (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[12px]" style={{ color: "#C9AFC2" }}>
              av {goal.toLocaleString("sv-SE")} kr mål
              {targetDate ? ` · ${new Date(targetDate).toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}` : ""}
            </p>
            <button
              onClick={() => {
                setGoalDraft(String(goal));
                setDateDraft(targetDate);
                setEditingGoal(true);
              }}
              className="flex items-center gap-1"
            >
              <Pencil size={11} color="#C9AFC2" />
              <span className="text-[11px] font-semibold" style={{ color: "#C9AFC2" }}>
                Ändra
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <input
              autoFocus
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              inputMode="decimal"
              placeholder="Sparmål (kr)"
              className="w-full rounded-xl px-3 py-2 text-[14px] font-semibold outline-none bg-cream text-ink"
            />
            <input
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              type="date"
              className="w-full rounded-xl px-3 py-2 text-[14px] font-semibold outline-none bg-cream text-ink"
            />
            <button onClick={saveGoal} className="w-full rounded-xl py-2 text-[13px] font-bold bg-mint text-cream">
              Spara mål
            </button>
          </div>
        )}
        <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-mint" />
      </div>

      <Card className="p-4 mb-4 flex items-center gap-4">
        <Ring pct={pct} color="#2EC4B6" size={72} stroke={8}>
          <span className="text-[12px] font-bold text-ink">{Math.round(pct)}%</span>
        </Ring>
        <div>
          <p className="text-[13px] font-semibold text-ink">
            {remainingToGoal > 0 ? `${remainingToGoal.toLocaleString("sv-SE")} kr kvar till målet` : "Målet uppnått! 🎉"}
          </p>
          <p className="text-[11px] mt-0.5 text-mauve">{deposits.length} insättningar hittills</p>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <p className="text-[12px] font-semibold mb-3 text-mauve">Om du sparar per månad</p>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setMonthlyContribution(Math.max(0, monthlyContribution - 250))}
            className="h-8 w-8 rounded-full flex items-center justify-center text-[16px] font-bold bg-cream border border-sand text-ink"
          >
            −
          </button>
          <div className="flex-1 rounded-xl py-2 text-center text-[16px] font-bold bg-cream border border-sand text-ink">
            {monthlyContribution.toLocaleString("sv-SE")} kr/mån
          </div>
          <button onClick={() => setMonthlyContribution(monthlyContribution + 250)} className="h-8 w-8 rounded-full flex items-center justify-center text-[16px] font-bold bg-mint text-cream">
            +
          </button>
        </div>

        {remainingToGoal === 0 ? (
          <p className="text-[13px] text-ink">Du har redan nått ditt sparmål — grattis! 🌸</p>
        ) : monthlyContribution > 0 ? (
          <>
            <p className="text-[13px] text-ink">
              når du målet i <span className="font-bold">{monthLabel(projectedDate)}</span> (om ca {monthsAtCurrentPace} mån)
            </p>
            {monthsDiff !== null && monthsDiff !== 0 && (
              <p className="text-[12px] font-semibold mt-1" style={{ color: monthsDiff > 0 ? "#2EC4B6" : "#FF6B5B" }}>
                {monthsDiff > 0 ? `${monthsDiff} mån tidigare än ditt satta mål 🎉` : `${Math.abs(monthsDiff)} mån senare än ditt satta mål`}
              </p>
            )}
          </>
        ) : (
          <p className="text-[13px] text-mauve">Ange ett månadsbelopp för att se en prognos.</p>
        )}
        <p className="text-[10px] mt-3 text-dust">Baserat enbart på beloppet du anger här — ingen ränta eller avkastning räknas in.</p>
      </Card>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[14px] font-bold text-ink">Insättningar</h2>
        <span className="text-[12px] font-medium text-mauve">{current.toLocaleString("sv-SE")} kr totalt</span>
      </div>
      <Card className="overflow-hidden mb-4">
        {deposits.length === 0 && <p className="text-[13px] p-4 text-mauve">Inga insättningar ännu.</p>}
        {deposits.map((d, i) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #F3E9DE" }}>
            <span className="text-[14px] font-medium text-ink">{d.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-semibold" style={{ color: d.amount < 0 ? "#FF6B5B" : "#2EC4B6" }}>
                {d.amount >= 0 ? "+" : ""}
                {d.amount.toLocaleString("sv-SE")} kr
              </span>
              <button onClick={() => removeDeposit(d.id)} aria-label="Ta bort">
                <X size={14} color="#D8C4B8" />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg bg-mint">
        <Plus size={18} color="#FFF9F4" />
        <span className="text-[14px] font-bold text-cream">Justera sparande</span>
      </button>

      {showAdd && (
        <div className="fixed inset-0 flex items-end justify-center z-10" style={{ background: "rgba(36,22,35,0.45)" }} onClick={() => setShowAdd(false)}>
          <div className="bloom-pop w-full max-w-sm rounded-t-3xl p-5 pb-8 bg-cream" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-10 rounded-full mx-auto mb-4 bg-sand" />
            <h3 className="font-display text-lg font-bold mb-3 text-ink">Ny insättning</h3>
            <p className="text-[11px] mb-3 text-mauve">Använd ett negativt belopp om du behövt ta ut pengar. Insättningar ger +10 XP 🌱</p>
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder="T.ex. Sparat i september"
              className="w-full rounded-xl px-4 py-3 mb-2 text-[14px] outline-none bg-white border border-sand text-ink"
            />
            <input
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              placeholder="Belopp (kr)"
              inputMode="decimal"
              className="w-full rounded-xl px-4 py-3 mb-4 text-[14px] outline-none bg-white border border-sand text-ink"
            />
            <button onClick={addDeposit} className="w-full rounded-xl py-3 text-[14px] font-bold bg-mint text-cream">
              Lägg till
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

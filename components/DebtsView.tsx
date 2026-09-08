"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { Card, Ring } from "./ui";
import { Loan } from "../lib/types";
import { daysSince, todayISO } from "../lib/dates";

export function DebtsView({
  loans,
  setLoans,
  reminderDays,
  setReminderDays,
  onAwardXp,
  onBack,
}: {
  loans: Loan[];
  setLoans: (l: Loan[]) => void;
  reminderDays: number;
  setReminderDays: (n: number) => void;
  onAwardXp: (n: number) => void;
  onBack: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftOriginal, setDraftOriginal] = useState("");
  const [draftBalance, setDraftBalance] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateDraft, setUpdateDraft] = useState("");

  const totalOriginal = loans.reduce((s, l) => s + l.originalAmount, 0);
  const totalCurrent = loans.reduce((s, l) => s + l.currentBalance, 0);
  const totalPaid = totalOriginal - totalCurrent;
  const pct = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;
  const overdueLoans = loans.filter((l) => daysSince(l.lastUpdated) >= reminderDays);

  function openAdd() {
    setEditing(null);
    setDraftLabel("");
    setDraftOriginal("");
    setDraftBalance("");
    setShowAdd(true);
  }

  function openEdit(loan: Loan) {
    setEditing(loan.id);
    setDraftLabel(loan.label);
    setDraftOriginal(String(loan.originalAmount));
    setDraftBalance(String(loan.currentBalance));
    setShowAdd(true);
  }

  function save() {
    const orig = parseFloat(draftOriginal);
    const bal = parseFloat(draftBalance);
    if (!draftLabel.trim() || !orig || orig <= 0 || bal < 0) return;
    const today = todayISO();
    if (editing) {
      setLoans(loans.map((l) => (l.id === editing ? { ...l, label: draftLabel.trim(), originalAmount: orig, currentBalance: bal, lastUpdated: today } : l)));
    } else {
      setLoans([...loans, { id: Date.now(), label: draftLabel.trim(), originalAmount: orig, currentBalance: bal, lastUpdated: today }]);
    }
    setShowAdd(false);
  }

  function remove(id: number) {
    setLoans(loans.filter((l) => l.id !== id));
  }

  function saveBalanceUpdate(id: number) {
    const val = parseFloat(updateDraft);
    if (isNaN(val) || val < 0) return;
    const today = todayISO();
    const loan = loans.find((l) => l.id === id);
    if (loan && val < loan.currentBalance) onAwardXp(15);
    setLoans(loans.map((l) => (l.id === id ? { ...l, currentBalance: val, lastUpdated: today } : l)));
    setUpdatingId(null);
    setUpdateDraft("");
  }

  return (
    <div className="w-full max-w-sm px-5 pt-8 pb-24 relative mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-sand" aria-label="Tillbaka">
          <ArrowLeft size={16} color="#241623" />
        </button>
        <h1 className="font-display text-2xl font-bold text-ink">Skulder</h1>
      </div>

      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
        <p className="text-[13px] font-medium" style={{ color: "#C9AFC2" }}>
          Kvar totalt
        </p>
        <p className="font-display text-4xl font-bold mt-1 text-cream">{totalCurrent.toLocaleString("sv-SE")} kr</p>
        <p className="text-[12px] mt-2" style={{ color: "#C9AFC2" }}>
          {totalPaid.toLocaleString("sv-SE")} kr avbetalat av {totalOriginal.toLocaleString("sv-SE")} kr
        </p>
        <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-gold" />
      </div>

      <Card className="p-4 mb-4 flex items-center gap-4">
        <Ring pct={pct} color="#FFB627" size={72} stroke={8}>
          <span className="text-[12px] font-bold text-ink">{Math.round(pct)}%</span>
        </Ring>
        <div>
          <p className="text-[13px] font-semibold text-ink">{pct >= 100 ? "Alla lån avbetalda! 🎉" : `${Math.round(pct)}% avbetalat`}</p>
          <p className="text-[11px] mt-0.5 text-mauve">{loans.length} lån</p>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <p className="text-[12px] font-semibold mb-3 text-mauve">Påminn mig att uppdatera saldo</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setReminderDays(30)}
            className="flex-1 rounded-xl py-2 text-[12px] font-bold border border-sand"
            style={{ background: reminderDays === 30 ? "#241623" : "#FFFFFF", color: reminderDays === 30 ? "#FFF9F4" : "#241623" }}
          >
            Var 30:e dag
          </button>
          <button
            onClick={() => setReminderDays(60)}
            className="flex-1 rounded-xl py-2 text-[12px] font-bold border border-sand"
            style={{ background: reminderDays === 60 ? "#241623" : "#FFFFFF", color: reminderDays === 60 ? "#FFF9F4" : "#241623" }}
          >
            Var 60:e dag
          </button>
        </div>
        {overdueLoans.length > 0 ? (
          <div className="rounded-xl px-3 py-2.5 bg-peach">
            <p className="text-[12px] font-semibold text-ink">
              {overdueLoans.length === 1 ? `${overdueLoans[0].label} har inte uppdaterats på ett tag` : `${overdueLoans.length} lån har inte uppdaterats på ett tag`}
            </p>
            <p className="text-[11px] mt-0.5 text-mauve">Kolla saldot i din bank-app och uppdatera nedan</p>
          </div>
        ) : (
          <p className="text-[11px] text-mauve">Allt uppdaterat — najs jobbat!</p>
        )}
      </Card>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[14px] font-bold text-ink">Dina lån</h2>
      </div>
      <Card className="overflow-hidden mb-4">
        {loans.length === 0 && <p className="text-[13px] p-4 text-mauve">Inga lån tillagda ännu.</p>}
        {loans.map((l, i) => {
          const loanPct = l.originalAmount > 0 ? ((l.originalAmount - l.currentBalance) / l.originalAmount) * 100 : 0;
          const overdue = daysSince(l.lastUpdated) >= reminderDays;
          return (
            <div key={l.id} className="px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #F3E9DE" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-medium text-ink">{l.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-ink">{l.currentBalance.toLocaleString("sv-SE")} kr</span>
                  <button onClick={() => openEdit(l)} aria-label="Redigera">
                    <Pencil size={14} color="#D8C4B8" />
                  </button>
                  <button onClick={() => remove(l.id)} aria-label="Ta bort">
                    <Trash2 size={14} color="#D8C4B8" />
                  </button>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5 bg-sand">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, loanPct)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: overdue ? "#FF6B5B" : "#B08D7A" }}>
                  Uppdaterat för {daysSince(l.lastUpdated)} dagar sedan
                </span>
                {updatingId === l.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={updateDraft}
                      onChange={(e) => setUpdateDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveBalanceUpdate(l.id)}
                      inputMode="decimal"
                      className="w-20 rounded-lg px-2 py-1 text-[12px] font-semibold outline-none bg-cream border border-sand text-ink"
                    />
                    <button onClick={() => saveBalanceUpdate(l.id)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gold text-cream">
                      Spara
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setUpdatingId(l.id);
                      setUpdateDraft(String(l.currentBalance));
                    }}
                    className="text-[11px] font-bold text-gold"
                  >
                    Uppdatera saldo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <button onClick={openAdd} className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg bg-gold">
        <Plus size={18} color="#FFF9F4" />
        <span className="text-[14px] font-bold text-cream">Lägg till lån</span>
      </button>

      {showAdd && (
        <div className="fixed inset-0 flex items-end justify-center z-10" style={{ background: "rgba(36,22,35,0.45)" }} onClick={() => setShowAdd(false)}>
          <div className="bloom-pop w-full max-w-sm rounded-t-3xl p-5 pb-8 bg-cream" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-10 rounded-full mx-auto mb-4 bg-sand" />
            <h3 className="font-display text-lg font-bold mb-3 text-ink">{editing ? "Redigera lån" : "Nytt lån"}</h3>
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder="T.ex. Billån, CSN, Privatlån"
              className="w-full rounded-xl px-4 py-3 mb-2 text-[14px] outline-none bg-white border border-sand text-ink"
            />
            <input
              value={draftOriginal}
              onChange={(e) => setDraftOriginal(e.target.value)}
              placeholder="Ursprungligt lånebelopp (kr)"
              inputMode="decimal"
              className="w-full rounded-xl px-4 py-3 mb-2 text-[14px] outline-none bg-white border border-sand text-ink"
            />
            <input
              value={draftBalance}
              onChange={(e) => setDraftBalance(e.target.value)}
              placeholder="Kvar att betala nu (kr)"
              inputMode="decimal"
              className="w-full rounded-xl px-4 py-3 mb-4 text-[14px] outline-none bg-white border border-sand text-ink"
            />
            <button onClick={save} className="w-full rounded-xl py-3 text-[14px] font-bold bg-gold text-cream">
              {editing ? "Spara ändringar" : "Lägg till"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

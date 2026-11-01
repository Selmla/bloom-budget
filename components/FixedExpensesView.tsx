"use client";

import { ReactNode, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2, Plus, X } from "lucide-react";
import { Card, Modal, inputClass, primaryClass } from "./ui";
import { newId, parseAmount } from "../lib/money";
import { FixedExpense, CATEGORY_COLORS } from "../lib/types";

export function FixedExpensesView({
  notice,
  fixed,
  setFixed,
  income,
  setIncome,
  planningNext = false,
  periodLabel = "",
  onBack,
}: {
  notice?: ReactNode;
  fixed: FixedExpense[];
  setFixed: (f: FixedExpense[]) => void;
  income: number;
  setIncome: (n: number) => void;
  planningNext?: boolean;
  periodLabel?: string;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftCategory, setDraftCategory] = useState("Övrigt");
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState(String(income));

  const total = fixed.reduce((s, e) => s + e.amount, 0);
  const pctOfIncome = income > 0 ? (total / income) * 100 : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    fixed.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [fixed]);

  function saveIncome() {
    const val = parseAmount(incomeDraft);
    if (incomeDraft.trim() !== "" && Number.isFinite(val) && val >= 0)
      setIncome(val);
    else {
      setError("Ange en giltig inkomst, minst 0 kr.");
      return;
    }
    setError("");
    setEditingIncome(false);
  }

  function openAdd() {
    setEditing(null);
    setDraftLabel("");
    setDraftAmount("");
    setDraftCategory("Övrigt");
    setShowAdd(true);
  }

  function openEdit(item: FixedExpense) {
    setEditing(item.id);
    setDraftLabel(item.label);
    setDraftAmount(String(item.amount));
    setDraftCategory(item.category);
    setShowAdd(true);
  }

  function save() {
    const amt = parseAmount(draftAmount);
    if (!draftLabel.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError("Ange beskrivning och ett giltigt belopp över 0 kr.");
      return;
    }
    setError("");
    if (editing) {
      setFixed(
        fixed.map((e) =>
          e.id === editing
            ? {
                ...e,
                label: draftLabel.trim(),
                amount: amt,
                category: draftCategory,
              }
            : e,
        ),
      );
    } else {
      setFixed([
        ...fixed,
        {
          id: newId(),
          label: draftLabel.trim(),
          amount: amt,
          category: draftCategory,
        },
      ]);
    }
    setShowAdd(false);
  }

  function remove(id: number) {
    setFixed(fixed.filter((e) => e.id !== id));
  }

  return (
    <div className="w-full max-w-sm px-5 pt-8 pb-24 relative mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-sand"
          aria-label="Tillbaka"
        >
          <ArrowLeft size={16} color="#241623" />
        </button>
        <h1 className="font-display text-2xl font-bold text-ink">
          Inkomst och utgifter
        </h1>
      </div>
      <p className="text-[12px] font-semibold text-mauve mb-4">{periodLabel}</p>

      {notice}
      {error && (
        <p role="alert" className="my-3">
          {error}
        </p>
      )}
      {planningNext && (
        <Card className="p-3 mb-4 bg-peach border-peachline">
          <p className="text-[12px] text-ink">
            Du planerar inkomst och fasta utgifter för den valda perioden. Andra
            perioder påverkas inte. En ny period börjar med en kopia av
            föregående periods plan.
          </p>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-mauve">Månadsinkomst</p>
          {!editingIncome && (
            <button
              onClick={() => {
                setIncomeDraft(String(income));
                setEditingIncome(true);
              }}
              className="flex items-center gap-1"
            >
              <Pencil size={12} color="#B08D7A" />
              <span className="text-[11px] font-semibold text-mauve">
                Ändra
              </span>
            </button>
          )}
        </div>
        {editingIncome ? (
          <div data-bloom-editor className="flex items-center gap-2 mt-1.5">
            <input
              autoFocus
              value={incomeDraft}
              onChange={(e) => setIncomeDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveIncome()}
              inputMode="decimal"
              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-[20px] font-bold outline-none bg-cream border border-sand text-ink"
            />
            <button
              onClick={saveIncome}
              className="rounded-xl px-4 py-2 text-[13px] font-bold bg-coral text-cream"
            >
              Spara
            </button>
          </div>
        ) : (
          <p className="font-display text-2xl font-bold mt-0.5 text-ink">
            {income.toLocaleString("sv-SE")} kr
          </p>
        )}
      </Card>

      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-ink">
        <p
          className="text-[13px] font-medium text-mauve/80"
          style={{ color: "#C9AFC2" }}
        >
          Totalt per månad
        </p>
        <p className="font-display text-4xl font-bold mt-1 text-cream">
          {total.toLocaleString("sv-SE")} kr
        </p>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[12px]" style={{ color: "#C9AFC2" }}>
            {income > 0
              ? `${pctOfIncome.toFixed(0)}% av din inkomst`
              : "Ange din inkomst ovan"}
          </p>
        </div>
        <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full opacity-20 bg-coral" />
      </div>

      <Card className="p-4 mb-4">
        <p className="text-[11px] font-semibold mb-2 text-mauve">
          Fördelning per kategori
        </p>
        <div className="space-y-1.5">
          {byCategory.length === 0 && (
            <p className="text-[12px] text-mauve">Inga poster ännu.</p>
          )}
          {byCategory.map(([cat, amt]) => (
            <div key={cat} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: CATEGORY_COLORS[cat] || "#C9AFC2" }}
              />
              <span className="text-[11px] flex-1 text-ink">{cat}</span>
              <span className="text-[11px] font-semibold text-mauve">
                {amt.toLocaleString("sv-SE")} kr
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[14px] font-bold text-ink">Alla poster</h2>
        <span className="text-[12px] font-medium text-mauve">
          {fixed.length} st
        </span>
      </div>
      <Card className="overflow-hidden mb-4">
        {fixed.length === 0 && (
          <p className="text-[13px] p-4 text-mauve">
            Inga fasta utgifter ännu.
          </p>
        )}
        {fixed.map((e, i) => (
          <div
            key={e.id}
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: i === 0 ? "none" : "1px solid #F3E9DE" }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: CATEGORY_COLORS[e.category] || "#C9AFC2" }}
              />
              <div>
                <p className="text-[14px] font-medium text-ink">{e.label}</p>
                <p className="text-[11px] text-mauve">{e.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-semibold text-ink">
                {e.amount.toLocaleString("sv-SE")} kr
              </span>
              <button onClick={() => openEdit(e)} aria-label="Redigera">
                <Pencil size={14} color="#D8C4B8" />
              </button>
              <button onClick={() => remove(e.id)} aria-label="Ta bort">
                <Trash2 size={14} color="#D8C4B8" />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <button
        onClick={openAdd}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg bg-coral"
      >
        <Plus size={18} color="#FFF9F4" />
        <span className="text-[14px] font-bold text-cream">
          Lägg till utgift
        </span>
      </button>

      {showAdd && (
        <Modal
          title={editing ? "Redigera utgift" : "Ny fast utgift"}
          onClose={() => {
            setShowAdd(false);
            setError("");
          }}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="block text-sm">
              Utgiftens namn
              <input
                className={inputClass}
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Belopp per månad (kr)
              <input
                className={inputClass}
                inputMode="decimal"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Kategori
              <select
                className={inputClass}
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
              >
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button className={primaryClass}>
              {editing ? "Spara ändringar" : "Lägg till"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

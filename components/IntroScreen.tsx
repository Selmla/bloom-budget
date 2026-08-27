"use client";

import { Card } from "./ui";

const STEPS = [
  {
    emoji: "🌸",
    title: "Se allt på ett ställe",
    body: "Inkomst, fasta utgifter och köp — samlat så du alltid vet hur mycket du har kvar.",
  },
  {
    emoji: "🎯",
    title: "Sätt egna mål",
    body: "Sparmål, avbetalning av lån och en budget som passar dig — vecka eller månad.",
  },
  {
    emoji: "🌱",
    title: "Byggd för goda vanor",
    body: "XP för no-spend dagar, sparande och avklarade budgetperioder — inte för att bara öppna appen.",
  },
];

export function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-6 bg-cream">
      <div className="w-full max-w-sm">
        <p className="text-5xl mb-3 text-center">🌸</p>
        <h1 className="font-display text-3xl font-bold text-center mb-2 text-ink">Bloom Budget</h1>
        <p className="text-[13px] text-center mb-8 text-mauve">
          Din budget, dina villkor — allt sparas bara i den här webbläsaren.
        </p>

        <div className="space-y-3 mb-8">
          {STEPS.map((s) => (
            <Card key={s.title} className="p-4 flex items-start gap-3">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[13px] font-bold text-ink">{s.title}</p>
                <p className="text-[12px] mt-0.5 text-mauve">{s.body}</p>
              </div>
            </Card>
          ))}
        </div>

        <button onClick={onStart} className="w-full rounded-2xl py-3.5 text-[15px] font-bold bg-coral text-cream">
          Kom igång
        </button>
      </div>
    </div>
  );
}

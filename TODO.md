# Idéer / framtida funktioner

Inget av detta är påbörjat — bara idéer från brainstorming, inte i prioritetsordning.

## Motivation vid nivå-upp / delmål

Idag firas bara hela 500-XP-steg (nivå-upp) med en kort konfetti-burst. Håll spelaren peppad oftare och gör framsteg mätbara över tid:

- **Fira oftare, inte bara vid nivå-upp** — liten pulsering/glimt på XP-baren var 25:e/50:e XP, inte bara vid taket.
- **Namngivna nivåer eller växande symbol** — t.ex. "Sparsam", "Budgetmästare", eller en Bloom-knopp som blir en full blomma/bukett vid högre nivåer, istället för bara ett nummer.
- **Kumulativa "hittills"-stats** — totalt sparat sedan start, total skuld avbetalad, längsta streak någonsin (inte bara nuvarande). Apellerar till att inte vilja bryta sitt eget rekord.
- **Badges för riktiga beteenden** — separat från XP: "Första no-spend-veckan", "Ett lån helt avbetalt", "3 månader i rad inom budget". Mest meningsfullt men kräver en badge-lista och upplåsningslogik.
- **Streak-eskalering** — flamikonen (finns redan) ändrar utseende/färg vid trösklar (t.ex. glöd vid 4 i rad, större vid 8) istället för att alltid se likadan ut.

## No-spend-kalender + period-reviews

Trappa i tre steg:

1. **Kalendervy** — varje dag färgkodad: no-spend (grön), spenderat lite/mycket (gradient efter belopp), tom (ingen data).
   - **Datamodell-gap att fixa först:** `lastNoSpendDate` sparar idag bara det senaste no-spend-datumet, inte hela historiken. Måste bli en lista/array av datum (t.ex. `noSpendDates: string[]`) för att en kalender ska kunna visa alla dagar.
   - Resten (vilka dagar man spenderade mest) går redan att räkna fram direkt från `purchases` (datum + belopp) utan nya fält.
   - Oklart ännu var kalendern ska bo i appen — egen flik, eller del av Budget-vyn.
2. **Månadsöversikt** — total spenderat vs budget, dagen/veckan man spenderade mest, antal no-spend-dagar, ev. toppkategori.
3. **Årsöversikt** — jämför månader mot varandra (bästa/sämsta), trend över tid.

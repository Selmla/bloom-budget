# Bloom Budget

En budget-app utan bankkoppling. All data sparas bara i din egen webbläsare
(`localStorage`) — det finns ingen backend, inget konto, och ingen server som
ser din information. Andra som installerar appen från samma länk får sin egen
lokala data, helt separat från din.

## Köra lokalt

```bash
npm install
npm run dev
```

Öppna http://localhost:3000

## Deploya själv (gratis, ~5 minuter)

**Rekommenderat: Vercel**

1. Skapa ett gratis konto på [vercel.com](https://vercel.com) (kan logga in med GitHub)
2. Pusha den här mappen till ett nytt GitHub-repo:
   ```bash
   git init
   git add .
   git commit -m "Bloom Budget"
   git branch -M main
   git remote add origin <din-github-repo-url>
   git push -u origin main
   ```
3. På vercel.com: "Add New Project" → välj ditt repo → Deploy
4. Klart — du får en länk typ `bloom-budget-ditt-namn.vercel.app`

## Installera på mobilen

1. Öppna din deployade länk i **Chrome** (Android) eller **Safari** (iPhone)
2. Android: tre prickar → "Lägg till på startskärmen"
   iPhone: dela-ikonen → "Lägg till på hemskärmen"
3. Nu har du en riktig app-ikon som öppnas i eget fönster, fungerar offline,
   och sparar din data lokalt på just den telefonen

## Viktigt att veta

- **Data delas INTE mellan enheter.** Använder du appen på både mobilen och
  datorn är det två separata datamängder. Det finns ingen synk eftersom det
  inte finns någon server.
- **Rensar du webbläsarens data (cache/cookies) för sajten försvinner din
  budget.** Använd "Exportera backup"-knappen i appen då och då och spara
  filen någonstans (Drive, mejl, etc.) som säkerhetskopia.
- **Om du avinstallerar appen eller byter telefon**, importera bara din
  senaste backup-fil i den nya installationen för att få tillbaka allt.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS. Inga externa API:er,
inga tredjepartstjänster förutom Google Fonts (typsnitt laddas via CDN).

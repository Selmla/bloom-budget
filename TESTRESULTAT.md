# Testresultat – budget, sparande, skulder och appuppdateringar

Datum: 2026-11-01. Testerna använder påhittade uppgifter på localhost, inte användarens budget.

## Automatiska tester – godkända

`npm test` kör:

- Inkomsthistorik och separata månadsplaner, inklusive kopiering, egna startdatum, årsskifte och flera missade periodbyten.
- Sparöverföring, uttag, saldorättelse och borttagning. Sparande och disponibelt belopp påverkas tillsammans och endast för rätt datumintervall.
- Extra inkomst som sparas finns inte samtidigt kvar att använda.
- Lånebetalning med amortering och ränta/avgifter. Fasta betalningar räknas inte två gånger; saldokorrigering skapar ingen betalning.
- Validering av svenska belopp, datum, negativa saldon, för stor amortering och dubbla händelser.
- Äldre backup migreras utan påhittade datum eller retroaktiva kassaflöden. Export/import bevarar beräkningarna; ogiltiga strukturer avvisas.
- Pågående avstämning ger inte slutlig XP. Avslutad avstämning belönas en gång. Senare ändringar gör kontrollen inaktuell. Avstängd XP respekteras.
- Service worker: ny HTML hämtas från nätet, nya skript/stilmallar förladdas, offline-fallback fungerar och endast äldre Bloom-cache rensas. Budgetlagringen berörs inte.
- Uppdateringsklient: öppna formulär skyddas, sparande begärs före omladdning, misslyckat sparande stoppar omladdningen, ingen omladdningsloop och versionskontroll fungerar även utan service worker.

Två efterföljande `npm run build` passerade kompilering, typkontroll och generering av produktionssidor. `git diff --check` passerade.

## Webbläsartester – godkända

| Fall | Förväntat och observerat |
| --- | --- |
| Startguide | 20 000 kr inkomst och 7 000 kr hyra ger 13 000 kr kvar. Svenska belopp med mellanslag och komma accepteras. Sparmål och lån kan läggas till i guiden. |
| Sparöverföring | 1 000,50 kr flyttas till sparande; budgeten blir 11 999,50 kr och sparsaldo 1 000,50 kr. |
| Lånebetalning | 1 000 kr amortering + 100 kr ränta ger skuld 9 000 kr och budget 10 899,50 kr. Historiken visar båda delarna. |
| Saldorättelse och ångra | Rättelse till 8 900 kr får egen historik. Ångra återställer 9 000 kr. Budget och XP förändras inte av rättelsen. |
| Avstämning | Kräver användarens bekräftelse. Visar samma beräkningar som startsidan. Pågående period ger inte +20 XP. Nytt köp gör kontrollen inaktuell. |
| Borttagning och ångra | Köp på 123,45 kr kan tas bort och återställas; budgeten följer båda ändringarna. |
| Redigering och ångra | Köp ändras från 10 kr till 20,10 kr utan en extra post; budgeten minskar med 10,10 kr. Ångra återställer ursprunget. |
| Riktig appuppdatering | Produktionsversion A ersattes av B på samma adress medan ett formulär var öppet. Appen visade att uppdateringen väntade. Utkastet låg kvar och kunde sparas. Därefter laddade appen om automatiskt. |
| Data efter uppdatering | Sparsaldo 1 000,50 kr, skuld 9 000 kr, två köp på sammanlagt 133,45 kr och budget 10 766,05 kr fanns kvar efter den automatiska omladdningen. Inställningar och tidigare avstämning fanns kvar. |
| Export och import i appen | Budgeten exporterades med appens knapp och samma fil importerades. Appen bekräftade återställningen och samtliga ovanstående belopp fanns kvar. |
| Layout | Ingen horisontell overflow i testvyn. Dialoger har namn, stängknapp och fokusfälla; kontroller har synlig tangentbordsfokus och större träffytor. |

Versionsmärken i uppdateringstestet:

- A: `fefa6aaf-4e94-42a7-906c-eb9bb292b104` (Next-build `yn02hUj60LBerjCsBPqle`).
- B: `f7634971-4cbc-4e48-88c7-0a6f9ec2db83` (Next-build `vKy1EDvbMO1zNafwfFNh3`).

## Avgränsning

Webbläsartestet gjordes i den lokala inbyggda webbläsaren. Offline-fallen och fel vid sparande täcks av automatiska tester, inte ett fysiskt nätavbrott på mobil. Installerad Safari/iOS-PWA är inte separat enhetstestad. Beteendeeffekten på motivation och ekonomisk kontroll behöver följas upp med användare efter leverans.

Alla fyra implementationstapper samt tillägget för automatiska uppdateringar är genomförda. Ingen bankkoppling, kontotjänst eller analysinsamling har lagts till.

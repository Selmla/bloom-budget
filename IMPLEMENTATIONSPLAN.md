# Bloom Budget – implementationsplan

Syfte: användaren ska förstå sin budget, kunna ta ett rimligt nästa steg och se sitt sparande växa och sina skulder minska.

## Etapp 1: Sammanhängande pengar – påbörjas först

- Daterade sparhändelser. Skilj en ny överföring från ett ingående saldo/en rättelse.
- En sparöverföring påverkar sparsaldo och månadens disponibla belopp i en och samma uppdatering. Uttag tillbaka till vardagsbudgeten fungerar åt andra hållet.
- Registrera lånebetalning med amortering och ränta/avgifter. Bara amorteringen minskar skulden.
- Betalning som redan ingår i fasta utgifter ska inte dras en andra gång. Användaren väljer uttryckligen detta.
- Saldokorrigering är en annan handling än betalning och ger inte belöning för amortering.
- Spara skuldhändelser med datum och före/efter-saldo. Bevara äldre data utan att hitta på datum eller betalningar.
- Startsidan visar ”Kvar enligt budget” och synliga belopp för sparöverföringar och lånebetalningar.
- Tester: separata månader, överföring/uttag, återtagning av sparhändelse, extra inkomst som sparas, ränta kontra amortering, fasta kostnader utan dubbelräkning, felaktiga indata, omladdning och äldre backup.

Klart när: en handling uppdaterar båda berörda delarna; samma pengar kan inte samtidigt räknas som sparade och disponibla. Ingen migrering ändrar befintliga saldon retroaktivt.

## Etapp 2: Begriplig utveckling

- Namngivet sparmål och tydlig skillnad mellan faktisk månadsutveckling och prognos.
- Skuldhistorik och minskning sedan första registrerade saldo. Arkivera slutbetalda lån.
- Startsidan visar belopp, datum för senaste avstämning och en relevant nästa handling.
- Fler historiska månader. Både insättningar och uttag visas tydligt.

Klart när: användaren kan se varför sparsaldo och skuld har ändrats samt skilja faktiska framsteg från planerade belopp.

## Etapp 3: Månatlig avstämning och hållbar motivation

- Kort avstämning: kontrollera poster, summera månaden, bekräfta nästa plan.
- Månader med ofullständig registrering framställs inte som bevisad budgetframgång.
- Frivillig XP och no-spend. Belöna avstämning och bekräftade delmål. Behåll tidigare framsteg efter en svår månad.
- Valfri påminnelse i appen utan att införa konton eller extern datainsamling.

Klart när: användaren förstår vad som är kontrollerat och får stöd att fortsätta även efter en missad månad.

## Etapp 4: Enklare start och återställning

- Guidad första budget, frivilliga steg för sparande och lån.
- Redigera transaktioner och datum, ångra borttagning, konsekventa svenska belopp och tydliga felfält.
- Tydligare backup och testad återställning; eventuell synk utreds separat.
- Kontroll av mobilanvändning, läsbarhet, tangentbord och knapparnas träffytor.

## Leverans och validering

Varje etapp levereras som en granskbar Git-gren med tester och produktionsbygge. Ändringar i sparad data ska vara bakåtkompatibla. Testdata används vid webbläsartester.

Produktutfall prövas med användare: förstår de vilket belopp de kan använda, kan de registrera sparande/betalning utan dubbelregistrering och upplever de ökad kontroll? Aktivitet och XP är inte primära framgångsmått. Ingen analysinsamling införs utan ett separat beslut.

Etapp 1–4 genomförs i denna leverans, enligt användarens utökade klartecken. Merge till main är godkänd när implementation och tester har gått igenom. Produktutfallen följs därefter upp med användare; kodtester kan inte bevisa en beteendeeffekt.

## Automatisk appuppdatering – tillägg

- Varje produktionsbygge får en unik version som klienten och service workern kan upptäcka.
- Sök vid öppning, återkomst till appen och regelbundet när den är synlig och online.
- Hämta nya appfiler automatiskt. Vänta med omladdning medan ett formulär eller en startguide är öppen.
- Spara aktuell budget synkront före omladdning. Avbryt omladdningen om sparandet misslyckas.
- Använd samma localStorage-nyckel och validerad migrering. Rensa endast äldre appfiler i cache, aldrig budgetdata eller andra appars cache.
- Cachelagra den nya versionens skript och stilmallar före aktivering; behåll offline-fallback.
- Testa sparad data mellan två produktionsbyggen och att ett öppet utkast kan sparas före uppdateringen.

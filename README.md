# Vane

Små vaner, i ro og mak. En rolig vaneapp for iPhone, uten streaks, poeng eller mas. Med en enkel oversikt over hva pengene går til.

- **I dag**: huk av daglige vaner (ja/nei eller antall, f.eks. 5 av 8 glass) og ukentlige vaner («3 ganger i uka»).
- **Dagens mål**: ett eller flere små mål for dagen. Morgenvarselet (standard kl. 07) spør hva du vil få til.
- **Rett i går**: trykk på i går i ukestripen for å rette. Eldre dager er låst.
- **Oversikt**: rutenett der fargestyrken viser hvor mye som ble gjort. Uke, 4 uker eller år, for alt samlet og for hver vane.
- **Påminnelser**: per vane, med knappene *Gjort*, *+1* og *Om 1 time* rett i varselet. Kommer ikke hvis vanen allerede er gjort.
- **Widgets**: «I dag» på hjemskjermen viser én ting om gangen med én knapp: om morgenen «Hva vil du få til i dag?», så første uferdige mål, så neste vane. Huk av rett fra widgeten. «Vane» på låseskjermen viser en ring med vanene som er gjort, og det viktigste akkurat nå ved siden av. Uten mål spør begge fram til kl. 12. Svarer du «Ikke i dag», spør de ikke mer den dagen.
- **Penger**: hver gang du betaler med Apple Pay, kommer et varsel som spør om kategori. Kjenner Vane stedet, foreslår den kategorien du valgte sist, og du godkjenner med ett trykk uten å åpne appen. Kjøp som ikke er godkjent, ligger under *Venter* (med tall på fanen) til du tar dem. Del opp et kjøp, skriv et notat, eller la et kjøp ikke telle med. Månedens sum per kategori, de siste seks månedene, og alle kjøp med søk. Vipps, kontanter og nettkjøp legger du inn med +. Sju faste kategorier som kan få nytt navn, ikon og farge, skjules og flyttes, og du kan legge til egne. Ingen budsjett og ingen rødfarge.
- **Penger-widget**: «Penger» på hjemskjermen viser hvor mange kjøp som venter, eller er en knapp for å legge inn et kjøp. «I dag» får et lite merke i hjørnet når noe venter.
- Ingen konto, ingen server. Alt lagres lokalt på telefonen.

## Kjøp fra Apple Pay

Det settes opp én gang i Snarveier (veiviseren ligger under Penger og Innstillinger):

1. Snarveier → **Automatisering** → **+** → **Transaksjon**. Velg kortene, og at den skal kjøre med en gang uten å spørre.
2. **Ny tom snarvei** → søk etter Vane → **Registrer kjøp**.
3. Trykk på **Beløp** og velg *Snarvei-input* → beløpet. Trykk på **Sted** og velg *Snarvei-input* → butikken (forhandleren).

Det gjelder bare Apple Pay i butikk (iPhone eller klokka mot terminal). Vipps, kontanter, nettkjøp og fysisk kort kommer ikke med av seg selv. iOS lar ikke apper lese varsler fra Wallet, så dette er eneste vei.

## Bygge og installere uten Mac

Appen bygges i skyen med [EAS](https://expo.dev/eas) og installeres via TestFlight. Du trenger en Expo-konto og en betalt Apple Developer-konto. Xcode trengs ikke.

### Engangsoppsett

**1. Første bygg fra en terminal.** Dette trengs bare én gang. EAS må logge inn hos Apple for å lage sertifikatet og registrere appen i App Store Connect, og det går ikke an fra en automatisk jobb. Det tar 5–10 minutter, og PC-en gjør ingen tung jobb.

```bash
git clone https://github.com/egeiran/vane && cd vane
npm install
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

Svar ja når EAS spør om å opprette prosjektet, logge inn hos Apple, lage sertifikater og lage en App Store Connect API-nøkkel. Push-varsler fra server trengs ikke, så det kan du hoppe over. Når bygget er ferdig, sendes det til TestFlight.

**2. Legg inn App Store Connect-ID-en.** Du finner den i App Store Connect → appen → *App-informasjon* → *Apple-ID*, et tall. Legg den inn i `eas.json`:

```json
"submit": { "production": { "ios": { "ascAppId": "1234567890" } } }
```

**3. Gi GitHub tilgang til EAS.** Lag en token på [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) og legg den inn i repoet: *Settings → Secrets and variables → Actions → New repository secret*, med navnet `EXPO_TOKEN`.

### Nye bygg: én knapp

På GitHub går du til **Actions → Bygg til iPhone → Run workflow**. Det fungerer også fra GitHub-appen på mobilen.

Jobben sjekker koden (lint, typer og tester) og starter bygget hos EAS. Ferdig bygg havner i TestFlight av seg selv, vanligvis etter 15–30 minutter. Installer TestFlight-appen på iPhonen første gang. Etterpå oppdateres Vane der.

### Oppdateringer uten nytt bygg (OTA)

Endringer i JavaScript-koden, også i widgetene, kan sendes rett til telefonen: **Actions → Send oppdatering → Run workflow**. Det tar et par minutter. Åpne Vane, lukk den helt og åpne den igjen, så er oppdateringen i bruk.

Dette virker ikke når en endring trenger ny native kode, som en ny pakke med native kode, eller endringer i `app.json`. Da må du bygge på nytt. Appen sjekker selv at en oppdatering passer bygget på telefonen (`runtimeVersion` med `fingerprint`), så en oppdatering som ikke passer, blir bare ikke brukt.

### Utvikle med hot reload (valgfritt)

Vil du se endringer på telefonen med en gang, uten nye bygg, trenger du et utviklingsbygg:

```bash
npx eas-cli@latest device:create   # registrer iPhonen (åpne lenken på telefonen)
npx eas-cli@latest build --platform ios --profile development
npx expo start --tunnel
```

### Bundle-ID

Bundle-ID-en er `no.egeiran.vane`, og App Group-en er `group.no.egeiran.vane`. Vil du bytte, endrer du begge i `app.json` (`ios.bundleIdentifier` og `groupIdentifier` under `expo-widgets`).

## Utvikling

```bash
npm test            # enhetstester for logikken
npm run typecheck
npm run lint
```

| Mappe            | Innhold                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `src/app`        | Skjermene (Expo Router). `(tabs)` er I dag, Oversikt, Penger og Innstillinger. |
| `src/components` | Byggeklosser: vanerader, ukestripe, målkort, rutenett, kjøpsrader.             |
| `src/lib`        | Datoer, vanelogikk, penger, lagring, varsler og widget-synk.                   |
| `src/widgets`    | Widgetene, skrevet med `expo-widgets` og `@expo/ui`.                           |
| `app-intents`    | Swift i app-målet: «Registrer kjøp» for Snarveier og kjøpsvarslene.            |
| `plugins`        | Config-plugin som kobler kjøpsvarslene til AppDelegate.                         |

### Slik henger det sammen

- **Lagring:** `zustand` med SQLite-basert nøkkel/verdi-lager (`expo-sqlite/kv-store`). Ren logikk ligger i `src/lib/state.ts` og `src/lib/habits.ts` og er testet.
- **Varsler:** Morgenvarselet gjentas daglig. Påminnelser for vaner legges inn sju dager fram og fylles på hver gang appen åpnes. Vaner som allerede er gjort, får ingen påminnelse.
- **Penger:** Egen lagring (`src/lib/moneyStore.ts`, nøkkel `vane-penger`), ren logikk i `money.ts` og `moneyState.ts`. Beløp er i øre.
- **Kjøp fra Apple Pay:** Automatiseringen i Snarveier kjører `LogPurchaseIntent` (`app-intents/`) uten å åpne appen. Swift legger kjøpet i køen til `expo-app-intents`, sender varselet og teller opp «venter» i widgetene. Varselet har knapper per kategori (registrert fra appen med expo-notifications). Trykker du på forslaget, tar Swift imot svaret og legger det i køen. Det må skje i Swift, fordi appens JavaScript ikke kjører når iOS bare starter appen i bakgrunnen. Derfor kaller AppDelegate `PurchaseNotifications.install()` (`plugins/withPurchaseNotifications.js`). Appen leser køen når den starter og kommer i forgrunnen (`src/lib/purchases.ts`), og samme kjøp tas aldri inn to ganger. For å foreslå kategori sender appen navn på kategorier og steder til Swift (`setPurchaseConfig`).
- **Widgets:** Appen sender dagens vaner og mål til widgetene, pluss et oppslag som tar over ved midnatt. Hjemskjerm-widgeten velger selv hva den viser fram, så et trykk oppdaterer den med en gang, uten at appen kjører. Hver gang appen synker (`syncWidgets`), leser den først trykkene fra widgeten og sender deretter sin egen tilstand. Det skjer i kø, så appen aldri overskriver trykk den ikke har lest. Bare det widgeten selv har endret, tas inn, og som en endring oppå appens verdi (`applyWidgetTaps`). Widgeten tar bare imot trykk på dagens oppslag. Appen synker når den åpnes, når noe endres, og når den legges bort.

### Regler for widget-kode

Koden i `src/widgets/*Widget.tsx` med `'widget'` øverst kjører i widgetens egen runtime:

- bare komponenter og modifiers fra `@expo/ui/swift-ui`
- ingen hooks, ingen async og ingen imports av egen kode
- alt den trenger må ligge inne i funksjonen eller komme inn som props

Appen lagrer widget-koden på telefonen hver gang den starter, og widgetene bruker den foran det som ble bygget inn. Derfor kan endringer her sendes som OTA-oppdatering.

## Kjente begrensninger

- Swift-koden i `app-intents/` blir først kompilert i EAS-bygget. Logikken den deler med appen, er testet i JavaScript.
- «Penger» trenger et nytt bygg. Den kan ikke sendes som OTA-oppdatering til et eldre bygg.

- Interaktive widgets krever iOS 17 eller nyere. På eldre iOS kan widgetene bare vises.
- Åpner du ikke appen på over en uke, stopper vanepåminnelsene. Morgenvarselet fortsetter.
- Appen er ikke kjørt på en ekte iPhone ennå. Logikken er enhetstestet, iOS-bundelen bygger, og widgetene er testet i en simulert widget-runtime. Første EAS-bygg er den ekte testen.

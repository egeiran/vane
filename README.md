# Vane

Små vaner, i ro og mak. En rolig vaneapp for iPhone, uten streaks, poeng eller mas.

- **I dag**: huk av daglige vaner (ja/nei eller antall, f.eks. 5 av 8 glass) og ukentlige vaner («3 ganger i uka»).
- **Dagens mål**: ett eller flere små mål for dagen. Morgenvarselet (standard kl. 07) spør hva du vil få til.
- **Rett i går**: trykk på i går i ukestripen for å rette. Eldre dager er låst.
- **Oversikt**: rutenett der fargestyrken viser hvor mye som ble gjort. Uke, 4 uker eller år, for alt samlet og for hver vane.
- **Påminnelser**: per vane, med knappene *Gjort*, *+1* og *Om 1 time* rett i varselet. Kommer ikke hvis vanen allerede er gjort.
- **Widgets**: «I dag» på hjemskjermen (huk av rett fra widgeten) og «Vane» på låseskjermen. Uten mål viser låseskjermen «Hva vil du få til i dag?» fram til kl. 12, og neste vane resten av dagen. Svarer du «Ikke i dag», spør den ikke mer den dagen.
- Ingen konto, ingen server. Alt lagres lokalt på telefonen.

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
| `src/app`        | Skjermene (Expo Router). `(tabs)` er I dag, Oversikt og Innstillinger. |
| `src/components` | Byggeklosser: vanerader, ukestripe, målkort, rutenett.                 |
| `src/lib`        | Datoer, vanelogikk, lagring (`store.ts`), varsler og widget-synk.      |
| `src/widgets`    | Widgetene, skrevet med `expo-widgets` og `@expo/ui`.                   |

### Slik henger det sammen

- **Lagring:** `zustand` med SQLite-basert nøkkel/verdi-lager (`expo-sqlite/kv-store`). Ren logikk ligger i `src/lib/state.ts` og `src/lib/habits.ts` og er testet.
- **Varsler:** Morgenvarselet gjentas daglig. Påminnelser for vaner legges inn sju dager fram og fylles på hver gang appen åpnes. Vaner som allerede er gjort, får ingen påminnelse.
- **Widgets:** Appen sender dagens tilstand til widgetene, pluss et oppslag som tar over ved midnatt. Trykk i widgeten oppdaterer widgeten med en gang, uten at appen kjører. Når appen åpnes, leser den trykkene tilbake. Bare verdier widgeten selv har endret tas inn, så nyere endringer i appen ikke overskrives.

### Regler for widget-kode

Koden i `src/widgets/*Widget.tsx` med `'widget'` øverst kjører i widgetens egen runtime:

- bare komponenter og modifiers fra `@expo/ui/swift-ui`
- ingen hooks, ingen async og ingen imports av egen kode
- alt den trenger må ligge inne i funksjonen eller komme inn som props

Endringer der krever et nytt `eas build`.

## Kjente begrensninger

- Interaktive widgets krever iOS 17 eller nyere. På eldre iOS kan widgetene bare vises.
- Åpner du ikke appen på over en uke, stopper vanepåminnelsene. Morgenvarselet fortsetter.
- Appen er ikke kjørt på en ekte iPhone ennå. Logikken er enhetstestet, iOS-bundelen bygger, og widgetene er testet i en simulert widget-runtime. Første EAS-bygg er den ekte testen.

# Vane

Små vaner, i ro og mak. En rolig vaneapp for iPhone, uten streaks, poeng eller mas.

- **I dag**: huk av daglige vaner (ja/nei eller antall, f.eks. 5 av 8 glass) og ukentlige vaner («3 ganger i uka»).
- **Dagens mål**: ett eller flere små mål for dagen. Morgenvarselet (standard kl. 07) spør hva du vil få til.
- **Rett i går**: trykk på i går i ukestripen for å rette. Eldre dager er låst.
- **Oversikt**: rutenett der fargestyrken viser hvor mye som ble gjort. Uke, 4 uker eller år, for alt samlet og for hver vane.
- **Påminnelser**: per vane, med knappene *Gjort*, *+1* og *Om 1 time* rett i varselet. Kommer ikke hvis vanen allerede er gjort.
- **Widgets**: «I dag» på hjemskjermen (huk av rett fra widgeten) og «Vane» på låseskjermen.
- Ingen konto, ingen server. Alt lagres lokalt på telefonen.

## Bygge og installere uten Mac

Appen bygges i skyen med [EAS](https://expo.dev/eas). Du trenger Node 20 eller nyere, en Expo-konto og en betalt Apple Developer-konto (widgetene og installasjon på egen telefon krever det).

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init            # kobler prosjektet til Expo-kontoen din
npx eas-cli@latest device:create   # registrer iPhonen din (åpne lenken på telefonen)
npx eas-cli@latest build --profile development --platform ios
```

EAS spør om Apple-innloggingen din og ordner sertifikater, App Group og varsler automatisk. Når bygget er ferdig, installerer du det fra lenken/QR-koden på telefonen. Slå på *Utviklermodus* på iPhonen hvis den ber om det (Innstillinger → Personvern og sikkerhet → Utviklermodus).

Etterpå kan du utvikle fra PC-en:

```bash
npx expo start          # samme Wi-Fi som telefonen
npx expo start --tunnel # hvis telefonen ikke finner PC-en
```

Åpne Vane på telefonen, så lastes koden fra PC-en. Et nytt `eas build` trengs bare når du endrer native ting: pakker, `app.json` eller widgetene.

### Til TestFlight

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
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

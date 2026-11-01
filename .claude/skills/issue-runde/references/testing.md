# Testing i en runde

## Sjekkene

Det samme som CI (`.github/workflows/ci.yml`):

```bash
npm run lint
npm run typecheck
npm test -- --ci
```

Kjør alle tre før hver merge inn i integrasjonsbranchen. Testene ligger i
`src/lib/__tests__` og dekker den rene logikken. Det finnes ingen
komponenttester. Legg ikke inn et nytt testrammeverk uten å spørre.

## Appen i nettleseren

Vane er ikke en web-app, men den kan kjøres i nettleseren for skjermbilder:
widgetene er tomme funksjoner på web (`src/lib/widgetSync.web.ts`), og dataene
ligger i `localStorage` (`src/lib/kvStorage.web.ts`).

```bash
CI=1 BROWSER=none npx expo start --web --port 8091 --clear    # i bakgrunnen
node "$SKILL/scripts/skjermbilde.cjs" --sjekk
```

- Metro ser ikke nye filer uten omstart. Har du lagt til en fil, stopper du
  serveren (`pkill -f "[e]xpo start --web --port 8091"`) og starter den på nytt
  med `--clear`.
- Krasjer appen på web etter en endring, er det nesten alltid en native modul
  som importeres på toppen av en fil. Gi den en `.web.ts`-variant, eller importer
  den der den brukes. Det er en del av issuet, ikke en egen oppgave.
- Nettleseren er ikke iOS. Fanelinja (`NativeTabs`) legger seg oppå tittelen, og
  merket på Penger-fanen vises også når det er 0. Bildene viser tekst, tall og
  hva som vises, ikke utseendet på iPhone.

## Skjermbilder

```bash
SP=<scratchpad>/shots
node "$SKILL/scripts/skjermbilde.cjs" --ut $SP --navn 006-before / /overview /money /settings
node "$SKILL/scripts/skjermbilde.cjs" --ut $SP --navn 006-before-en --sprak en-US / /settings
```

- Testdataene i `scripts/testdata.cjs` er de samme hver gang: fire vaner, 90 dager
  med logger, to mål i dag, kjøp i NOK og EUR, ett som venter og ett som ikke
  telles. «I dag» er onsdag 4. november 2026 kl. 12.
- `--sprak en-US` setter nettleserens språk, som `expo-localization` leser på web.
  `--sone`, `--mork` og `--tom` (ny bruker) finnes også.
- `--lagre '{"vane-data.settings":{"weekStart":"sun"}}'` slår sammen felt inn i
  testdataene, for å vise en innstilling uten å klikke.
- Ta etter-bildene med nøyaktig de samme valgene som før-bildene. Skriptet
  feiler hvis appen kaster en feil på siden.
- Trenger du klikk, skriver du et eget Playwright-skript i scratchpaden med
  samme oppsett (se `skjermbilde.cjs`).
- Ruter: `/` (I dag), `/overview`, `/money`, `/settings`, `/purchases`,
  `/categories`, `/goals`, `/habit-form`, `/purchase-form`, `/money-setup`,
  `/habit/<id>` (testdataene har `h-tur`, `h-vann`, `h-les`, `h-trene`).

## Prebuild: se det native prosjektet uten Xcode

Endringer i `app.json`, `plugins/` eller native pakker kan sjekkes ved å generere
iOS-prosjektet i en kopi. Lag aldri `ios/` i repoet.

```bash
P=<scratchpad>/prebuild && rm -rf $P && mkdir -p $P
git archive HEAD | tar -x -C $P            # eller kopier arbeidstreet med endringene
ln -s "$PWD/node_modules" $P/node_modules
(cd $P && npx expo prebuild --platform ios --no-install)
```

Se så etter det endringen skal gi: `ios/Vane/Info.plist`, språkfilene i
`ios/Vane/Supporting/<språk>.lproj/`, `AppDelegate.swift`, og at filene er med i
begge målene i `ios/Vane.xcodeproj/project.pbxproj` (appen og
`ExpoWidgetsTarget`).

Vil du vite at JavaScript-bundelen for iOS bygger:

```bash
npx expo export --platform ios --output-dir <scratchpad>/export
```

## Swift

Swift i `app-intents/` blir først kompilert i EAS-bygget. I en skyøkt finnes
ingen kompilator. Derfor:

- hold Swift-endringene små og i egne commits,
- les koden rundt nøye, og følg mønsteret som er der,
- skriv testtilfellene fra JS-testene som kommentar i `PurchaseText.swift`, så
  speilet kan sjekkes for hånd,
- sett «Bygg til iPhone fra branchen» øverst i «Før merge».

På en Mac kan du bygge selv med `npx expo run:ios`.

## Det som bare kan testes på telefon

Skriv det i guiden og PR-en under «Må testes på telefon», med hva som er riktig
resultat. Typisk:

- widgetene på hjem- og låseskjermen, og trykk i dem,
- varsler med knapper, og svar uten å åpne appen,
- Snarveier: «Registrer kjøp» og Apple Pay-automatiseringen,
- språk og region på telefonen (Innstillinger → Generelt → Språk og region,
  eller Innstillinger → Vane → Språk),
- delingsark, filvelger, dialoger fra iOS.

Bygget gjør brukeren selv, fra branchen, med «Bygg til iPhone» i GitHub Actions.

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

- Med `CI=1` ser ikke Metro endringer i filer i det hele tatt, heller ikke i
  filer som fantes. Start serveren på nytt med `--clear` før hver runde med
  etter-bilder (`pkill -f "[e]xpo start --web --port 8091"`). Typed routes
  (`.expo/types/router.d.ts`) lages også på nytt da, så en ny skjerm typesjekker.
- Kjør serveren i bakgrunnen med lang `timeout`, ellers stoppes den midt i runden.
- Krasjer appen på web etter en endring, er det nesten alltid en native modul
  som importeres på toppen av en fil. Gi den en `.web.ts`-variant, eller importer
  den der den brukes. Det er en del av issuet, ikke en egen oppgave.
- Nettleseren er ikke iOS. Fanelinja (`NativeTabs`) legger seg oppå tittelen,
  merket på Penger-fanen vises også når det er 0, og ikonene (SF Symbols) vises
  ikke. Skjemaet for kjøp ruller sidelengs fordi feltet får fokus. Bildene viser
  tekst, tall og hva som vises, ikke utseendet på iPhone.
- expo-localization på web gir ingen valuta, og leser ikke ukestart og 12/24
  timer. Skriptet fyller inn ukestart og klokke fra nettleserens språk. Vil du
  vise en annen valuta, setter du den med `--lagre`.

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
- Bevis at noe er uendret med en pikselsammenligning (PIL finnes i containeren):

  ```bash
  python3 -c "from PIL import Image, ImageChops as C; a=Image.open('before-nb-today.png').convert('RGB'); b=Image.open('after-nb-today.png').convert('RGB'); print(C.difference(a,b).getbbox() or 'identisk')"
  ```
- Trenger du et før-bilde du glemte, lager du en worktree av
  integrasjonsbranchen (`git worktree add --detach <sti> <branch>`, med
  `node_modules` som symlink) og kjører Expo web derfra på port 8092
  (`--url http://localhost:8092`).
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
git archive HEAD | tar -x -C $P            # siste commit
# arbeidstreet med endringer som ikke er committet:
# tar --exclude=./node_modules --exclude=./.git -cf - . | tar -x -C $P
ln -s "$PWD/node_modules" $P/node_modules
(cd $P && npx expo prebuild --platform ios --no-install)
```

Se så etter det endringen skal gi: `ios/Vane/Info.plist`, språkfilene i
`ios/Vane/Supporting/<språk>.lproj/`, `AppDelegate.swift`, og at filene er med i
begge målene i `ios/Vane.xcodeproj/project.pbxproj` (appen og
`ExpoWidgetsTarget`). Finn Resources-fasen til hvert mål (`PBXNativeTarget` →
`buildPhases`) og se at filen står der. Et mål som bare får `en.lproj`, viser
engelsk for alle språk, fordi widget-målet har `en` som utviklingsspråk.

## Jest

- Testene går på norsk med en norsk telefon (`jest.setup.ts`). Tester av engelsk
  eller en annen region bytter med `setLang` og `setDeviceRegion`, og setter
  tilbake i `afterEach`.
- Node-typene er ikke med i tsconfig. Trenger en test å lese filer (som
  Swift-filene), deklarerer du `require` og `__dirname` i testfila, som i
  `src/lib/__tests__/i18n.test.ts`.
- Beløp bruker hardt mellomrom (`\u00a0`). Skriv det i forventet verdi.

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

---
name: issue-runde
description: Kjør en hel runde med GitHub-issues i Vane fra start til slutt. Finn de åpne issuene du kan løse i én økt (i rekkefølgen i veikartet, #4), legg en plan og still spørsmålene før du starter, lag en integrasjonsbranch med én commit per issue, test grundig (tester, appen i nettleseren, prebuild), få hvert issue reviewet av en egen agent, og avslutt med én PR til main og en review-guide (artifact) med før og etter for alt. Etter at planen er godkjent jobber du selvstendig og blir aldri stående og vente på svar. Bruk skillen når brukeren skriver /issue-runde, «kjør issue-runde», «ta en runde», «finn issues du kan fikse», «fiks så mange issues du klarer», ber deg løse flere issues i én økt, eller ber om neste fase i veikartet, også når skillen ikke nevnes ved navn.
---

# Issue-runde

En runde er en økt der du tar flere issues fra GitHub og leverer dem som én PR
til `main`, via en integrasjonsbranch, så selvstendig som mulig.

Brukeren skal sitte igjen med:

- én PR fra integrasjonsbranchen til `main`, med én commit per issue,
- en review-guide som artifact, med før og etter for hvert issue, eller en
  konkret testmåte der før og etter ikke kan vises,
- en kort liste over det som bare kan testes på telefon.

Brukeren reviewer helheten én gang, på slutten. Alt som kan fanges før det,
skal være fanget: tester, uavhengig review og CI. Review-guiden gjør den ene
reviewen rask.

## Vane er ikke et vanlig repo

Les `AGENTS.md`, `README.md` og `docs/retning.md` før du planlegger. Det viktigste
for en runde:

- **Én app, ingen server.** Expo (SDK i `package.json`), npm, ingen backend og ingen
  database. Sjekkene er de samme som CI: `npm run lint`, `npm run typecheck` og
  `npm test`.
- **Swift kompileres bare i EAS-bygget.** `app-intents/` og config plugins kan
  ikke bygges uten Xcode. I en skyøkt finnes ingen Swift-kompilator. Swift-endringer
  holdes små, ligger i egne commits, og PR-en til `main` ber brukeren kjøre
  «Bygg til iPhone» fra branchen før merge.
- **Etiketter:** `1 grunnmur`, `2 før lansering`, `3 etter lansering` og
  `4 senere` er fasene i veikartet (#4). `swift` betyr nytt bygg (ingen OTA).
  `manuelt` er arbeid utenfor koden. `vane+` er betalt.
- **Data på telefonen:** lagrede data lastes med `loadData` (`state.ts`) og
  `loadMoney` (`moneyState.ts`), som storene bruker i `merge`. Nye felt får
  standardverdi der, med en test for data fra før. Gamle data må aldri endre
  mening: kjøp fra før hovedvalutaen fantes, var i kroner, så de får NOK, ikke
  telefonens valuta. Det er Vanes migrasjoner.
- **Innstillinger som kan endres mens appen kjører** (som ukestart) sendes inn
  som parameter, ikke leses globalt. Ellers kan React Compiler vise gammel verdi.
  Det som bare endres ved omstart (språk, telefonens klokke), kan leses globalt.
- **Tekst:** all tekst går gjennom `tr` fra `src/i18n`, på norsk og engelsk.
  Swift-tekst og widgetnavn har engelsk i `locales/en.json`.
- **Lagrede automatiseringer:** `LogPurchaseIntent` og parameterne endres aldri.
  `PurchaseText.swift` speiler `src/lib/money.ts`. Navn i Swift må stemme med
  `src/lib/purchaseIntents.ts`.
- **Prinsippene i `docs/retning.md`** gjelder alt: ingen streaks, ingen budsjett,
  ingen konto, ingen SDK-er som samler inn data.

`$SKILL` betyr mappa denne fila ligger i. Sett `SKILL=<den stien>` i skallet før
første kommando. Skriptene ligger i `$SKILL/scripts/`: `skjermbilde.cjs` tar
skjermbilder av appen i nettleseren med Playwright, med faste testdata fra
`testdata.cjs` og fast dato.

Mangler et verktøy skillen nevner, gjør du det samme på en annen måte: uten
`gh` bruker du GitHub-verktøyene (`mcp__github__*`), uten PushNotification
skriver du meldingen i chatten og i guiden, og uten AskUserQuestion stiller du
spørsmålene som en nummerert liste.

## Flyten

0. Se hvor du står: skyøkt eller lokal økt, checkouten og hva som kan testes
1. Velg issues
2. Plan og spørsmål. Det er det eneste stedet du venter på brukeren.
3. Sett opp runden
4. Løs hvert issue: før-bilder, branch, kode, test, review, merge inn,
   oppdater guiden
5. Avslutt: `main` inn, hele suiten, PR til `main` klar, ferdig guide, rydding

Ber brukeren bare om en plan, stopper du etter fase 2.

Detaljene ligger i egne filer. Les dem når du kommer til steget:

- `references/testing.md`: sjekkene, appen i nettleseren, skjermbilder,
  prebuild, og det som må testes på telefon
- `references/pr-maler.md`: teksten i del-PR-ene, PR-en til `main` og
  sluttrapporten
- `references/review-guide.md`: hvordan review-guiden bygges og oppdateres,
  med malen i `assets/review-guide.html`

## 0. Se hvor du står

```bash
git status --short && git branch --show-current && git log --oneline -3
node "$SKILL/scripts/skjermbilde.cjs" --sjekk
ls node_modules >/dev/null 2>&1 || npm ci
```

- **Skyøkt** (claude.ai/code, branchen heter `claude/...`): du kan bare pushe til
  branchen økta fikk. Den er integrasjonsbranchen. Hvert issue får en lokal
  branch som squash-merges inn lokalt. Det blir ingen del-PR-er, og CI kjører på
  PR-en til `main`, som åpnes som utkast når runden settes opp. Ingen andre
  bruker checkouten, så du trenger ingen worktree.
- **Lokal økt:** integrasjonsbranch `feature/<tema>`, del-branch og del-PR per
  issue. Har hovedcheckouten endringer, eller kjører det dev-servere fra den,
  jobber du i en egen worktree. Bruk aldri `git stash`.
- **Porter:** Expo web på en ledig port (8091 som standard). Stopp aldri en server
  du ikke startet selv. `pkill -f` med et mønster som også står i din egen
  kommando, dreper skallet ditt: skriv mønsteret som `[e]xpo start --web`.
- **Nettet:** i en skyøkt kan docs.expo.dev, api.expo.dev og swift.org være
  stengt. Les da README, typene og kilden for SDK-versjonen i `node_modules`, og
  si det i planen. `npx expo install` trenger api.expo.dev; bruk
  `EXPO_OFFLINE=1 npx expo install <pakke>`, som tar versjonen fra
  `node_modules/expo/bundledNativeModules.json`.
- **Det som mangler** (Playwright, nett, Swift), står i planen under «Kan ikke
  testes her».

## 1. Velg issues

Hent åpne issues med labels og tekst (`gh issue list --json ...`, eller
`mcp__github__list_issues` med `body`). Les kandidatene helt, med kommentarene.
Les veikartet (#4): sjekklista der er rekkefølgen brukeren har valgt.

Et issue passer i runden når alt dette holder:

- **Det er innenfor det brukeren ba om.** «Grunnmuren» eller «bare JS» er en
  grense, ikke et hint. Hører en del av issuet til utenfor, kan resten tas, og
  da skriver PR-en til `main` «Del av #N», ikke `Closes`.
- **Det er neste i veikartet.** Ta fasen som står for tur. Et issue fra en senere
  fase tas bare hvis brukeren ber om det, eller det er lite og uavhengig.
- **Det er klart hva «ferdig» er.** Issuene i Vane har «Ferdig når». Et åpent
  punkt med et forslag kan du følge. Det står da under «Valg jeg tar uten å
  spørre». Et issue som venter på en avgjørelse ingen har foreslått svar på
  (se «Åpne spørsmål» i `docs/retning.md`), er ikke med.
- **Det kan bevises her.** Med tester, appen i nettleseren eller prebuild. Litt
  som bare kan sjekkes på telefon er greit, men ikke hele issuet (som påminnelser
  i bakgrunnen over en uke, eller StoreKit-kjøp).
- **Det krever ikke noe du ikke har:** App Store Connect, sertifikater, en ekte
  telefon for hele beviset, juridisk tekst eller `manuelt` arbeid.
- **Det avhenger ikke av noe som ikke er gjort.** Issuene sier det selv
  («Avhenger av #12»).
- **Ingen andre holder på med det.** Se etter åpne PR-er og gamle branches for
  issuet. Rør dem ikke, og nevn dem i planen.

**Rester:** se etter branches som aldri ble merget, men som issuene viser til
(som `docs/retning.md` i første runde), og etter punkter under «Må testes på
telefon» i forrige runde-PR som ikke er krysset av. Nevn dem i planen.

**Ting uten issue:** små, klare feil du finner, kan tas med som egne commits.
Større funn foreslås som nye issues. Lag aldri et issue uten at brukeren har
sagt ja.

Ta så mange som kan gjøres skikkelig i økta. Tre ferdige og godt testede issues
er bedre enn seks halvferdige. Ta et issue som andre bygger på, først. Issues
som rører de samme filene, tar du etter hverandre.

## 2. Plan og spørsmål

Planen skal stå på egne ben. Brukeren skal kunne lese den på telefonen og vite
hva som skjer, også det som skjer uten at hen blir spurt. Bruk denne malen:

```markdown
# Runde: <tema>, på `<integrasjonsbranch>`

<2–3 setninger: hvilke issues, og hvorfor akkurat de.>

## Slik går runden
- Integrasjonsbranch `<branch>` fra `origin/main` (<sha>), <hvor, og hvorfor>.
- Hvert issue får en egen branch. Det testes, reviewes av en egen agent og
  squash-merges til én commit.
- Før-bilder tas før første endring i hvert issue, og etter-bildene med samme
  testdata, dato og bredde.
- Til slutt én PR til `main`, med review-guiden. Du merger den selv, med merge
  commit. Jeg merger aldri til `main`, kjører ikke «Bygg til iPhone» eller
  «Send oppdatering», og rører ikke App Store Connect.
- Etter at du har sagt ja, venter jeg ikke på svar.
- Review-guiden: <lenke kommer når runden er satt opp>.

## Først: oppsett uten issue
<Egne commits som ikke hører til et issue. Fjern delen hvis det ikke er noen.>

## Issuene, i rekkefølgen jeg tar dem
| Issue | Hva som gjøres | Bevis | Risiko |
|---|---|---|---|

## Valg jeg tar uten å spørre
## Ikke med
## Kan ikke testes her
## Spørsmål
<Nummerert. Hvert med «Svarer du ikke: …».>
```

Om spørsmålene:

- **Bare spørsmål der svaret endrer runden**, som omfanget, eller om Swift som
  ikke kan kompileres her skal være med.
- **Standardsvaret er det forsiktige valget.** Det gjør runden mindre, eller
  holder alt bak en port brukeren selv kontrollerer (som bygget før merge). Det
  skriver ikke på GitHub (kommentarer, issues), og det rører aldri App Store
  Connect, EAS eller TestFlight.
- Bruk AskUserQuestion hvis den finnes. Spørsmålene må stå på egne ben, fordi
  brukeren kanskje bare ser dialogen.

**Vent så på svar.** Det er det eneste stedet i runden du venter. Er brukeren
borte, sender du planen kort som push-varsling, og sier at et kort «kjør»
holder. Har brukeren sagt rett ut at du skal starte uten å vente, starter du med
standardsvarene.

Svarene gjelder resten av runden. Endrer et svar en avgjørelse i
`docs/retning.md`, oppdaterer du den i det issuet det gjelder.

## 3. Sett opp runden

Skyøkt:

```bash
git fetch origin main
git switch -C <økt-branch> origin/main      # bare hvis den ikke har egne commits
git push -u origin <økt-branch>
```

Åpne PR-en til `main` som utkast med en gang (`references/pr-maler.md`), så CI
kjører på hver push. Den skriver «Utkast: runden pågår» øverst til den er klar.

Lokal økt: `git worktree add -b feature/<tema> .claude/worktrees/<tema> origin/main`,
`npm ci` der, og push.

Lag en oppgaveliste med ett punkt per issue, pluss «Avslutt».

Lag review-guiden nå (`references/review-guide.md`), med alle issuene som
«Venter», det som skal gjøres og hvordan det skal bevises. Publiser den, og gi
brukeren lenken.

## 4. Løs hvert issue

Bli ferdig med ett issue før du starter på neste. Et issue er ferdig når det er
merget inn i integrasjonsbranchen, eller parkert.

### a. Før-bilder før du endrer noe

Start Expo web og ta før-bildene fra integrasjonsbranchen, før første endring
(`references/testing.md`). Det du ikke tar nå, er borte etterpå. Ta bildene som
viser det issuet endrer: skjermene, et engelsk språk (`--sprak en-US`), eller
innstillingen issuet handler om. Kan det ikke vises på skjermen, tar du før-tall:
hva en funksjon gir for inndataene i issuet.

### b. Branch fra integrasjonsbranchen

```bash
git switch -c issue/<N>-<kort-navn> <integrasjonsbranch>
```

Endrer du skillen eller skriptene mens et issue pågår, committer du det på
integrasjonsbranchen og merger den inn i issue-branchen. Ellers bruker du gamle
skript i resten av issuet.

### c. Kod

Du skriver koden selv. Research kan sendes til subagenter, men en endring som
henger sammen, trenger én forfatter.

Følg `AGENTS.md`. Dette glipper oftest:

- **Commits per område** når de kan splittes (lib, app, widgets, Swift, config,
  docs). Conventional commits på norsk, med issuet: `feat(penger): hovedvaluta (#7)`.
  Swift alltid i egen commit.
- **Ren logikk i `src/lib`**, med tester i `src/lib/__tests__`.
- **Widget-koden** kjører i egen runtime: bare `@expo/ui/swift-ui`, ingen hooks,
  ingen imports. Tekst og data inn som props fra `widgetProps.ts`.
- **Swift-speilet:** endrer du `parseAmount`, `formatAmount`, `merchantKey` eller
  `cleanMerchant`, endrer du `PurchaseText.swift` likt, med de samme
  testtilfellene skrevet som kommentar der. Nye felt i `PurchaseConfig` er
  valgfrie (`String?`), så gammel lagret config fortsatt kan leses.
- **Nye pakker** med `npx expo install`. Native pakker gir nytt bygg.
- **Dokumentasjon:** oppdater README, `AGENTS.md` og `docs/retning.md` når oppsett
  eller en avgjørelse endres.

### d. Test

Kommandoene står i `references/testing.md`. Kort fortalt:

- Lint, typecheck og hele testsuiten.
- Ny oppførsel får nye tester. En feilretting får en test som feilet før.
- Gamle data: en test for at data uten de nye feltene lastes riktig.
- Kjør appen i nettleseren og ta etter-bildene med nøyaktig samme valg som
  før-bildene.
- Endringer i `app.json`, plugins eller native pakker: prebuild i en kopi, og se
  at resultatet er riktig.
- Skriv ned det du ikke fikk testet, og hvorfor.

### e. Uavhengig review

Send diffen til en subagent som kjører `code-review`-skillen. Rører endringen
data som kommer utenfra (filer som importeres, input fra Snarveier, varsler),
Vane+-status eller iCloud, sender du den også til en som kjører
`security-review`. Start dem samtidig. De skal bare rapportere. Fortell dem hva
issuet ber om, hvilke valg som er bevisste, og hvilken diff de skal se på
(`git diff <integrasjonsbranch>...issue/<N>-...`). `security-review` bruker
`origin/HEAD`, som ikke finnes i en skyøkt, så si at den kan se på diffen selv.

Reviewen finner nesten alltid noe. Ta den før merge, ikke etter.

Rett funnene i egne commits og kjør testene på nytt. Er du uenig i et funn,
skriver du det og hvorfor i guiden.

### f. Merge inn i integrasjonsbranchen

Skyøkt:

```bash
git switch <integrasjonsbranch>
git merge --squash issue/<N>-<kort-navn>
git commit     # «<tittel> (#N)», med en kort liste over hva som er endret
git push origin <integrasjonsbranch>
git branch -D issue/<N>-<kort-navn>
```

Vent på CI på PR-en til `main` i bakgrunnen. Feiler den, retter du og pusher én
gang.

Lokal økt: push del-branchen, åpne del-PR mot integrasjonsbranchen
(`references/pr-maler.md`, «Del av #N», aldri `Closes`), vent på grønn CI, og
squash-merge med `--match-head-commit` fra en checkout som ikke står på
del-branchen, uten `--delete-branch`.

### g. Oppdater review-guiden

Sett statusen for issuet til «Merget · <sha>», og bytt det planlagte innholdet
med det som faktisk ble gjort: hva som er endret, hva brukeren bør sjekke, før
og etter, hvilke sjekker som er grønne, og hva reviewen fant (rettet og ikke
rettet). Publiser på nytt til samme lenke.

Endret reviewen noe på skjermen, tar du etter-bildene på nytt, etter at Expo
web er startet på nytt.

## 5. Avslutt runden

1. **Merge `main` inn** hvis den har fått nye commits. Merge, aldri rebase.
2. **Kjør hele suiten** på integrasjonsbranchen: lint, typecheck, tester,
   prebuild og `npx expo export --platform ios` (iOS-bundelen bygger).
3. **PR til `main`:** skriv den ferdige teksten (`references/pr-maler.md`), med
   `Closes #N` per issue, lenken til guiden, «Før merge», «Etter merge», og det
   som må testes på telefon. Marker den klar når alt er grønt.
4. **Fyll toppen av review-guiden:** lenke til PR-en, tallene, «Tre ting å se
   særlig på», «Må testes på telefon», og «Før merge» og «Etter merge».
5. **Forbedre skillen** med det du lærte i runden, i en egen commit.
6. **Rydd:** stopp dev-serverne du startet, slett lokale branches og
   scratch-kopier.
7. **Si fra:** push-varsling med lenken til PR-en, og sluttrapporten i chatten.

Du merger aldri til `main`. Brukeren gjør det selv, med merge commit. Du kjører
heller aldri «Bygg til iPhone», «Send oppdatering», `eas build`, `eas update` eller
`eas submit`, og rører ikke App Store Connect. Det står som steg i «Før merge» og
«Etter merge», for brukeren.

## Når du står fast

Etter at planen er godkjent, jobber du selvstendig.

- **Et spørsmål underveis stopper aldri arbeidet.** Velg standardsvaret, skriv
  valget i guiden og PR-en under «Valgt uten svar», send spørsmålet som
  push-varsling, og fortsett.
- **Et issue som ikke lar seg fullføre:** la det ligge på sin egen branch (push
  den bare hvis økta har lov), merk det «Parkert» i guiden med grunnen, og gå
  videre. Halvferdig arbeid merges aldri inn i integrasjonsbranchen.
- **Ikke gå i ring.** Har du prøvd å rette samme feil tre ganger uten å komme
  nærmere, parkerer du issuet.
- **Gjør aldri noe som er vanskelig å gjøre om, uten et ja:** merge til `main`,
  bygg eller OTA, force-push av integrasjonsbranchen etter at PR-en er åpnet,
  lukke, endre eller kommentere issues, eller slette andres branches.

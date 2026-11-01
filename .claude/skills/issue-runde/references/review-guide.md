# Review-guiden

Review-guiden er en artifact (en privat side på claude.ai) som brukeren leser i
stedet for å gå gjennom diffen blindt. Den lages når runden settes opp, og
oppdateres etter hvert issue, til samme lenke.

## Bygg den

1. Last `artifact-design`-skillen før du skriver siden første gang.
2. Kopier `assets/review-guide.html` til scratchpaden, for eksempel
   `<scratchpad>/guide/index.html`. Bildene legges i `<scratchpad>/guide/img/`.
3. Erstatt alt i STORE BOKSTAVER, og fjern det som ikke brukes.
4. Publiser med Artifact-verktøyet: `file_path` er `index.html`, og bildene sendes
   med `files` (`{"img/006-before-today.png": "<scratchpad>/guide/img/006-before-today.png"}`),
   med `root` satt til guide-mappa. Første gang: `icon: "checklist"` og en
   `description` på én setning.
5. Gi brukeren lenken.

Neste gang publiserer du samme `file_path` på nytt, med bare de nye bildene i
`files`. Bilder som ikke sendes, blir liggende.

## Første utgave

- Toppen: tema, branch, hvor mange issues, «Sist oppdatert» og «Slik går runden».
- Status: én rad per issue, alle «Venter». Oppsett uten issue kan stå som en egen
  rad eller en kort liste.
- Én seksjon per issue som «Planlagt»: hva som skal gjøres, «Hva du bør sjekke»,
  en tabell «I dag | Forventet» og «Slik bevises det».
- «Ikke med»: hvert issue som er valgt bort, med grunnen.

## Etter hvert issue

- Raden i status blir «Merget · <sha>», med lenke til commiten.
- Seksjonen bytter «Planlagt» med det som ble gjort:
  - **Hva du bør sjekke:** filene og reglene der en feil ville gjort mest skade.
    Det er her brukeren bruker tiden sin.
  - **Bildepar:** samme skjerm før og etter. Telefonbilder i `shots is-phone`.
    «Etter» vises først. Velg få og gode bilder: de som viser endringen, ikke
    hver skjerm.
  - **Tabell Før | Etter** for det som ikke er et bilde: regler, tall, tekster.
  - **Sjekker** som er grønne, med antall tester.
  - **Må testes på telefon** for det nettleseren ikke kan vise.
- «Sist oppdatert» med tid og status.

Bildene fra skjermbilde.cjs er PNG i 780 × 1688. Er de mange, kan de gjøres om
til JPG for å holde siden liten. Hele siden med bilder må være under 16 MB.

## Siste utgave

Fyll toppen: lenke til PR-en, tallene (issues, tester, nye tester, Swift-filer),
«Før merge» og «Etter merge», «Tre ting å se særlig på» og «Må testes på
telefon».

## Skriv for den som reviewer

- Skriv hva som er annerledes for brukeren av appen, ikke hvordan koden er bygd.
- Hver påstand har et bevis på siden: et bilde, en tabell eller en test.
- Det du ikke fikk vist, står som «Slik tester du», med hva som er riktig resultat.
- Kort. Guiden skal gjøre reviewen raskere, ikke lengre.

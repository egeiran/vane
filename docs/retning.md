# Retning for Vane

Avgjort 1. november 2026. Arbeidet ligger som issues under [veikartet](#rekkefølge). Endrer vi en avgjørelse, oppdaterer vi dette dokumentet.

## Hva Vane er

En rolig app for folk som vil ha mer oversikt i livet sitt og bli bedre på vanene sine. **Vanene er kjernen.** Resten er moduler man velger selv.

Målet er ekstra inntekt: noen tusen kroner i måneden, med en app vi er stolte av.

## Prinsipper som ikke endres

- **Ingen streaks, poeng eller feiring.** Ingen rekker, merker eller konfetti, heller ikke for å selge mer.
- **Ingen budsjett og ingen rødfarge.** Penger viser hva som har skjedd, ikke hva du burde ha gjort.
- **Ingen konto og ingen server.** Alt ligger på telefonen og i brukerens egen iCloud. Vi kan ikke se dataene. Det er også et salgsargument: App Store-siden skal kunne si «Data Not Collected».

## Produktet

| Del | Hva | Pris |
| --- | --- | --- |
| Vaner | Daglige og ukentlige vaner, dagens mål, oversikt, påminnelser, widgets | Gratis opptil 3 vaner, ubegrenset med Vane+ |
| Penger | Kjøp lagt inn for hånd, kategorier, månedssum, søk, import fra nettbanken (CSV) | Gratis (bankimporten avgjøres i #13, anbefalt gratis) |
| Penger: Apple Pay | Automatiseringen i Snarveier med varsel, kategoriforslag og kategoriknapper i varselet | Vane+ |
| Dagbok og humør | En setning og et humør per dag, vist i Oversikt | Gratis |
| Apple Helse | Skritt, søvn, trening og lignende huker av vaner automatisk | Vane+ |
| Faste utgifter | Abonnementer og faste trekk, hva som går ut hver måned | Vane+ |
| Mat | Protein (med mål) og kalorier per dag: raskt tall, egne matvarer, retter, Matvaretabellen, «Som i går» med ett trykk og en protein-widget | Avgjøres når Vane+ kommer (anbefalt gratis) |
| KI på telefonen | Kategori for nye steder, rolig ukesoppsummering | Vane+ |
| iCloud og eksport | Synk, sikkerhetskopi, eksport og import | Gratis (det handler om tillit) |

Brukeren velger moduler i oppstarten («Hva vil du ha oversikt over?») og kan endre det i Innstillinger. Er Penger slått av, er fanen borte.

Standardkategoriene i Penger er Dagligvarer, Spise ute, Transport, Hjem, Shopping, Fritid, Helse og Annet. Helse kom 26. november 2026 (#33), for apotek, lege, tannlege og trening. De som hadde appen fra før, får den som skjult kategori de kan slå på.

## Det man har gjort tidligere

Appen skal ikke være tom de første dagene (#36, avgjort 26. november 2026):
- Når en vane lages, i oppstarten eller i «Ny vane», kan man merke dagene man har gjort den tidligere, i en kalender som blar så langt bakover man vil. Vanen regnes fra den første merkede dagen, og dager uten merke etter det telles som ikke gjort. Tellevaner telles opp med ett trykk om gangen.
- Etterpå gjelder regelen om at bare i dag og i går kan endres, som før. Kalenderen er et unntak bare når vanen lages.
- I oppstarten kan Penger fylles med en kontoutskrift fra nettbanken (CSV). Steget «Hvordan vil du få inn kjøpene?» viser Apple Pay, nettbanken og for hånd.

## Vane+

- **Priser i Norge:** 39 kr i måneden, 249 kr i året eller 499 kr for livstid. Apple regner om til andre land.
- **14 dager gratis** på abonnementet (introduksjonstilbud i App Store).
- **Familiedeling** er på.
- **Ingenting låses når Vane+ går ut.** Alle vaner kan fortsatt hukes av, men man kan ikke legge til nye over 3. Kjøp fra Apple Pay kommer fortsatt inn under *Venter*, men uten varsel og forslag. Data blir aldri tatt fra noen.
- Vane+ vises der funksjonen er, rolig og uten sprett-opp-skjermer. Avhuking blir aldri avbrutt av salg.
- Kjøp og status håndteres med StoreKit 2 på telefonen, uten egen server og uten tredjepart.

## Data

- Lokalt i SQLite, som i dag.
- **iCloud (CloudKit, privat database)** for synk og sikkerhetskopi. Ingen innlogging, fordi Apple-ID-en brukes.
- Eksport og import av fil (JSON for alt, CSV for kjøp).
- Ingen deling med andre foreløpig. Vane er personlig.

## Marked og språk

- **Norsk og engelsk fra start.**
- For hele verden: valuta, ukestart, datoformat og 12/24-timersklokke følger telefonen og kan endres.
- Vane er i App Store (status 23. november 2026). Fra 26. november 2026 betyr «lansering» at markedsføringen starter, rundt nyttår, fordi vaneapper får flest nedlastinger tidlig i januar. Det som står under «Neste» i rekkefølgen under, skal være ute før det, som oppdateringer.
- Planen for desember 2026 er to bygg: det første sendes til Apple rundt 7. desember (det som trenger Swift i #33 og #34, og #14), det andre rundt 14. desember (Vane+, #12 og #13). Resten sendes som OTA.

## Plattform

- iPhone.
- Apple Watch er ønsket, men venter til vi kan teste på en klokke.
- Ikke Android, iPad eller web nå.

## KI

Bare Apples språkmodell på telefonen. Ingenting sendes ut. Krever en iPhone med Apple Intelligence, og ligger i Vane+.

## Åpne spørsmål

- **Retting av eldre dager.** I dag kan bare i dag og i går rettes. Siden 22. november 2026 (#31) kan man bla tilbake til den første dagen med data og lese den, men ikke endre den. Unntaket er kalenderen når en vane lages (se «Det man har gjort tidligere»). Det er ikke et ufravikelig prinsipp, men vi venter med å endre det mer. Alternativer: siste 7 dager for alle, eller eldre dager med Vane+.
- **Mat og Vane+.** Om Mat er gratis, eller om for eksempel søk i Matvaretabellen og «Som i går» krever Vane+, avgjøres sammen med #13. Anbefalingen er at Mat er gratis, også «Som i går» og protein-widgeten.
- **Vane+ i Penger (#33).** Alt bygges uten grense til #13 er ferdig. Anbefalingen er at knappene og forslagene i kjøpsvarselet krever Vane+, fordi de hører til Apple Pay-automatiseringen, mens bankimporten er gratis, fordi den fyller appen fra første dag.
- **Strekkode i Mat.** Kommer etter markedsføringen, hvis Open Food Facts har nok norske proteinprodukter. Det sjekkes først med 20 vanlige varer.
- **Matvaretabellen i en betalt app.** Mattilsynet ber om at tabellen oppgis som kilde, og sier at dataene kan lagres lokalt. Det står ingen egen lisens for API-et. Før Vane+ kommer, bør vi spørre matvaretabellen@mattilsynet.no om bruk i en app man betaler for.
- **Kategori i App Store:** Produktivitet eller Helse og trening.

## Rekkefølge

Veikartet er [issue #4](https://github.com/egeiran/vane/issues/4), med en sjekkliste over alle issuene i den rekkefølgen de bør gjøres (#5–#36).

1. **Grunnmur:** test på ekte iPhone, språk (norsk og engelsk), valuta og ukestart, moduler.
2. **Neste** (het «Før lansering» til appen kom i App Store): oppstart, eksport og import, iCloud, Vane+ og grenser, påminnelser i bakgrunnen, vurdering i App Store, personvern, færre trykk i Penger og bankimport (#33), ett trykk i Mat og protein-widget (#34), det man har gjort tidligere (#36) og App Store-siden. Etiketten er `2 neste`. Alt dette skal være ute når markedsføringen starter.
3. **Etter lansering**, det vil si etter at markedsføringen har startet: Siri og Action-knappen, Apple Helse, faste utgifter, KI, strekkode i Mat.

Dagbok og humør (#19) ble gjort tidligere, i samme runde som oppstarten. Kveldsvarselet er av som standard, og kommer hver kveld når det er på, som morgenvarselet.

Faste utgifter (#21) ble også gjort tidligere, 9. november 2026. De er en egen linje i Penger. Fra 23. november 2026 kan de tas med i månedens sum med en bryter (av som standard): trekkene som har gått ut, blir en egen rad i månedskortet, og et trekk som alt er logget som kjøp fra samme sted samme måned, telles ikke to ganger. Modulen ligger under Penger og er av til man slår den på. Varselet dagen før kommer kl. 09 og er av som standard. Den er gratis til Vane+ finnes, og #13 legger den bak Vane+ som i tabellen over.
Mat (#28) ble lagt til 13. november 2026, som en egen modul med fane. Den er laget for å få i seg nok protein, og følger de samme prinsippene som resten av appen:
- Protein har et fast mål i gram. Kalorier har ingen mål, bare en sum som kan skjules.
- Ingen snitt, ingen streaks og ingen rødfarge.
- Som for vanene kan bare i dag og i går endres.
- Varslene er av som standard.
- En protein-widget kommer med bygget i desember 2026 (#34). Den følger måltidet og logger med ett trykk. Snarveier og Apple Helse kommer senere.

UX-runden (#31) ble gjort 22.–23. november 2026, etter en gjennomgang med klikkbare forslag: sveip mellom dager og måneder, Uke/Måned/År i Oversikt, native headere og ark, hold-inne-menyer og sveip på rader, dra for å flytte, iOS sine tidsvelgere, rolige overganger, og en tydeligere Mat-side. Appen var da allerede i App Store, så skjermbildene der (#17) bør tas på nytt etter den.

Siden appen er i App Store, når «Send oppdatering» alle brukerne. En branch testes derfor med et bygg i TestFlight, og oppdateringen sendes fra `main`. Data som ligger på brukernes telefoner, må alltid kunne lastes etter en oppdatering.

4. **Senere:** Apple Watch.

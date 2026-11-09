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
| Penger | Kjøp lagt inn for hånd, kategorier, månedssum, søk | Gratis |
| Penger: Apple Pay | Automatiseringen i Snarveier med varsel og kategoriforslag | Vane+ |
| Dagbok og humør | En setning og et humør per dag, vist i Oversikt | Gratis |
| Apple Helse | Skritt, søvn, trening og lignende huker av vaner automatisk | Vane+ |
| Faste utgifter | Abonnementer og faste trekk, hva som går ut hver måned | Vane+ |
| KI på telefonen | Kategori for nye steder, rolig ukesoppsummering | Vane+ |
| iCloud og eksport | Synk, sikkerhetskopi, eksport og import | Gratis (det handler om tillit) |

Brukeren velger moduler i oppstarten («Hva vil du ha oversikt over?») og kan endre det i Innstillinger. Er Penger slått av, er fanen borte.

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
- Lansering når det er ferdig, ingen fast dato. Vaneapper får flest nedlastinger tidlig i januar, så det er verdt å sikte mot hvis vi er nær.

## Plattform

- iPhone.
- Apple Watch er ønsket, men venter til vi kan teste på en klokke.
- Ikke Android, iPad eller web nå.

## KI

Bare Apples språkmodell på telefonen. Ingenting sendes ut. Krever en iPhone med Apple Intelligence, og ligger i Vane+.

## Åpne spørsmål

- **Retting av eldre dager.** I dag kan bare i dag og i går rettes. Det er ikke et ufravikelig prinsipp, men vi venter med å endre det. Alternativer: siste 7 dager for alle, eller eldre dager med Vane+.
- **Kategori i App Store:** Produktivitet eller Helse og trening.

## Rekkefølge

Veikartet er [issue #4](https://github.com/egeiran/vane/issues/4), med en sjekkliste over alle issuene i den rekkefølgen de bør gjøres (#5–#23).

1. **Grunnmur:** test på ekte iPhone, språk (norsk og engelsk), valuta og ukestart, moduler.
2. **Før lansering:** oppstart, eksport og import, iCloud, Vane+ og grenser, påminnelser i bakgrunnen, vurdering i App Store, personvern og App Store-siden.
3. **Etter lansering:** Siri og Action-knappen, Apple Helse, faste utgifter, KI.

Dagbok og humør (#19) ble gjort tidligere, i samme runde som oppstarten. Kveldsvarselet er av som standard, og kommer hver kveld når det er på, som morgenvarselet.

Faste utgifter (#21) ble også gjort tidligere, 9. november 2026. De er en egen linje i Penger og telles ikke med i månedens sum. Modulen ligger under Penger og er av til man slår den på. Varselet dagen før kommer kl. 09 og er av som standard. Den er gratis til Vane+ finnes, og #13 legger den bak Vane+ som i tabellen over.
4. **Senere:** Apple Watch.

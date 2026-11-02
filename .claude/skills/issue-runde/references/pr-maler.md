# Maler: PR-er og sluttrapport

Skriv på norsk, kort og konkret. Ingen modellnavn i PR-er eller commits.
Avslutt hver PR-tekst med linjene systemet ber om (lenken til Claude Code).

## PR til main

Tittel: `Runde: <tema> (#N, #N, #N)`

```markdown
<Én setning: hva runden gjør. Mens runden pågår: «Utkast: runden pågår. Teksten
fylles ut når alle issuene er merget.»>

Review-guide med før og etter: <lenke>

Closes #N
Closes #N
Del av #N   <!-- når bare en del av issuet er gjort -->

## Før merge
1. <Har runden Swift, app.json eller nye native pakker:> Kjør **Actions → Bygg til
   iPhone** fra branchen `<branch>` og test punktene under «Må testes på telefon».
   Bygget er den første som kompilerer Swift-koden.
2. Merge med **Create a merge commit**, ikke squash, så `main` får én commit per
   issue.

## Etter merge
- <Nytt bygg til TestFlight fra main, eller «Send oppdatering» hvis runden bare
  endret JavaScript. Si hvilket, og hvorfor.>

## Issuene
| Issue | Commit | Hva som er endret |
|---|---|---|
| #N <navn> | <sha> | <én linje> |

## Uten issue
- <commit>: <hva og hvorfor>

## Testet
- `npm run lint`, `npm run typecheck`, `npm test`: <N> tester (<M> nye), grønne.
- Appen i nettleseren: <hvilke skjermer, språk>.
- Prebuild: <hva som ble sjekket i det genererte prosjektet>.
- `npx expo export --platform ios`: bygger.

## Må testes på telefon
- [ ] <hva, hvordan, og hva som er riktig>

## Valgt uten svar
- <spørsmål som kom underveis, og standardsvaret som ble valgt>

## Funnet underveis
- <feil eller forslag utenfor runden, som kan bli egne issues>
```

## Del-PR (bare i lokal økt)

Tittel: `<type>(<område>): <hva> (#N)`

```markdown
Del av #N. Går til `<integrasjonsbranch>`, ikke `main`.

## Hva
- <punkter>

## Valg
- <bevisste valg, og hvorfor>

## Testet
- <sjekker, nye tester, skjermbilder>

## Ikke testet
- <hva, og hvorfor>
```

## Sluttrapport i chatten

```markdown
Runden er ferdig: <PR-lenke>. Review-guide: <lenke>.

- **Merget:** #N <navn>, #N <navn>
- **Parkert:** #N, <grunn>   <!-- fjern hvis ingen -->
- **Testet:** <N> tester (<M> nye), lint, typecheck, prebuild, iOS-bundelen
- **Før merge:** <det viktigste, som bygget fra branchen>
- **Må testes på telefon:** <de viktigste punktene>
- **Forslag til nye issues:** <hvis noen>
```

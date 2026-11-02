import { getLocales } from 'expo-localization';

import { en } from './en';
import { nb, type Strings } from './nb';

/**
 * Språket i appen: norsk (bokmål) eller engelsk, etter telefonen.
 *
 * Bruk `tr` for all tekst brukeren ser: `tr.today.title`, `tr.habits.times(3)`. Teksten ligger i
 * `nb.ts`, som er fasiten, og `en.ts`, som TypeScript tvinger til å ha de samme nøklene.
 * Språket velges én gang når appen starter. iOS starter appen på nytt når språket endres
 * (Innstillinger → Vane → Språk), så det trengs ikke noe valg i appen.
 *
 * Data lagres aldri oversatt: standardkategoriene og «Ukjent sted» lagres på norsk og vises
 * oversatt (se `categoryName` og `merchantName` i `money.ts`).
 */

export type Lang = 'nb' | 'en';
export type { Strings };

const STRINGS: Record<Lang, Strings> = { nb, en };

/**
 * Språket for en liste med foretrukne språk, slik iOS velger blant språkene appen har: det første
 * som er norsk (nb, nn eller no) eller engelsk, vinner. Ingen av dem gir engelsk, som iOS også gjør,
 * fordi `CFBundleDevelopmentRegion` i app.json er `en`. Da er Swift-tekstene og appen på samme språk.
 */
export function langFromLocales(locales: readonly { languageCode: string | null }[]): Lang {
  for (const l of locales) {
    const code = l.languageCode?.toLowerCase();
    if (code === 'nb' || code === 'nn' || code === 'no') return 'nb';
    if (code === 'en') return 'en';
  }
  return 'en';
}

function detect(): Lang {
  try {
    return langFromLocales(getLocales());
  } catch {
    return 'en';
  }
}

let current: Lang = detect();

export const getLang = (): Lang => current;

/** Bytter språk. Brukes i tester; appen velger språket ved oppstart. */
export function setLang(lang: Lang) {
  current = lang;
}

export const stringsFor = (lang: Lang): Strings => STRINGS[lang];

/** Teksten på det gjeldende språket. Leses når den brukes, så `setLang` virker straks. */
export const tr: Strings = new Proxy({} as Strings, {
  get: (_, key) => STRINGS[current][key as keyof Strings],
});

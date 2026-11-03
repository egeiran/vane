import type { Data, HabitInput, MoneyData } from './types';

/** Oppstarten lar deg velge så mange vaner. Det er lettere å holde på noen få. */
export const MAX_FIRST_HABITS = 3;

/**
 * Oppstarten vises til den er ferdig eller hoppet over. Alle som brukte appen før oppstarten
 * fantes, har `onboarded` (se `loadData`), og de som allerede har kjøp, ser den ikke. Leses én gang
 * når appen starter.
 */
export function needsOnboarding(data: Data, money: MoneyData): boolean {
  return !data.settings.onboarded && money.purchases.length === 0;
}

/**
 * Hvor oppstarten begynner. Ble appen lukket etter at vanene var lagt til, fortsetter den med
 * varslene, så ingen vaner legges til to ganger og spørsmålet om varsler ikke blir borte.
 */
export function onboardingStart(data: Data): OnboardingStep {
  return data.habits.length > 0 ? 'notifications' : 'welcome';
}

export type SuggestionKey = 'walk' | 'water' | 'read' | 'exercise' | 'stretch' | 'phone';

/** Forslagene i oppstarten. Navnet står i `tr.onboarding.suggestions`, enheten i `suggestionUnits`. */
export const HABIT_SUGGESTIONS: { key: SuggestionKey; input: Omit<HabitInput, 'name' | 'unit'> }[] = [
  { key: 'walk', input: { color: 'salvie', type: 'check', target: 1, schedule: { kind: 'daily' }, reminder: null } },
  { key: 'water', input: { color: 'himmel', type: 'count', target: 8, schedule: { kind: 'daily' }, reminder: null } },
  { key: 'read', input: { color: 'lavendel', type: 'check', target: 1, schedule: { kind: 'daily' }, reminder: null } },
  { key: 'exercise', input: { color: 'fersken', type: 'check', target: 1, schedule: { kind: 'weekly', times: 3 }, reminder: null } },
  { key: 'stretch', input: { color: 'sand', type: 'check', target: 1, schedule: { kind: 'daily' }, reminder: null } },
  { key: 'phone', input: { color: 'rose', type: 'check', target: 1, schedule: { kind: 'daily' }, reminder: null } },
];

/** En vane man har valgt i oppstarten: et forslag, eller en egen med bare navn. */
export type FirstHabit = { key: SuggestionKey } | { name: string };

const sameChoice = (a: FirstHabit, b: FirstHabit) =>
  'key' in a ? 'key' in b && a.key === b.key : 'name' in b && a.name.toLowerCase() === b.name.toLowerCase();

/** Velg eller fjern et forslag. Er det fullt, skjer ingenting. */
export function toggleFirstHabit(chosen: FirstHabit[], choice: FirstHabit): FirstHabit[] {
  if (chosen.some((c) => sameChoice(c, choice))) return chosen.filter((c) => !sameChoice(c, choice));
  if (chosen.length >= MAX_FIRST_HABITS) return chosen;
  return [...chosen, choice];
}

/**
 * Legg til en egen vane. Tomme navn, like navn og et fullt valg gir ingen endring. Heter den det
 * samme som et forslag, velges forslaget.
 */
export function addOwnHabit(chosen: FirstHabit[], name: string, suggestions: Record<SuggestionKey, string>): FirstHabit[] {
  const clean = name.trim();
  const key = HABIT_SUGGESTIONS.find((s) => suggestions[s.key].toLowerCase() === clean.toLowerCase())?.key;
  const choice: FirstHabit = key ? { key } : { name: clean };
  if (!clean || chosen.some((c) => sameChoice(c, choice)) || chosen.length >= MAX_FIRST_HABITS) return chosen;
  return [...chosen, choice];
}

/**
 * Vanene som skal lages, i den rekkefølgen de ble valgt. En egen vane er ja/nei hver dag, i en
 * farge som ikke er brukt av forslagene som er valgt.
 */
export function firstHabitInputs(
  chosen: FirstHabit[],
  text: { suggestions: Record<SuggestionKey, string>; suggestionUnits: Partial<Record<SuggestionKey, string>> }
): HabitInput[] {
  const used = new Set(chosen.flatMap((c) => ('key' in c ? [suggestion(c.key).input.color] : [])));
  const free = HABIT_SUGGESTIONS.map((s) => s.input.color).filter((c) => !used.has(c));
  let next = 0;
  return chosen.map((c) => {
    if ('key' in c) {
      const s = suggestion(c.key);
      return { ...s.input, name: text.suggestions[c.key], unit: s.input.type === 'count' ? (text.suggestionUnits[c.key] ?? '') : '' };
    }
    const color = free[next++ % free.length] ?? 'salvie';
    return { name: c.name, color, type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: null };
  });
}

function suggestion(key: SuggestionKey) {
  const s = HABIT_SUGGESTIONS.find((x) => x.key === key);
  if (!s) throw new Error(`Ukjent forslag: ${key}`);
  return s;
}

export type OnboardingStep = 'welcome' | 'modules' | 'habits' | 'notifications' | 'widgets' | 'applePay';

export type OnboardingProgress = { step: OnboardingStep; chosen: FirstHabit[]; setupOpened: boolean };

/**
 * Hvor man er i oppstarten, så lenge appen kjører. Et trykk på en widget eller et varsel underveis
 * åpner oppstarten på nytt (resten av appen er låst), og da skal den fortsette der den var.
 */
let progress: OnboardingProgress | null = null;

export const onboardingProgress = (): OnboardingProgress | null => progress;

export function rememberOnboarding(next: OnboardingProgress | null) {
  progress = next;
}

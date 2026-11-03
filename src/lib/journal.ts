import { addDays, type DateKey } from './dates';
import type { Data, JournalEntry, Mood } from './types';

/**
 * Dagbok og humør: én setning og ett humør per dag. Ren logikk. Som for vanene kan bare i dag og
 * i går endres (se «Åpne spørsmål» i docs/retning.md). Ingen snitt, ingen trend og ingen vurdering:
 * Vane viser hva man skrev, ikke hva det betyr.
 */

export const MOODS: Mood[] = [1, 2, 3, 4, 5];

/** Én setning, ikke en hel side. */
export const MAX_JOURNAL_TEXT = 280;

export const isMood = (v: unknown): v is Mood => v === 1 || v === 2 || v === 3 || v === 4 || v === 5;

export function journalOn(data: Pick<Data, 'journal'>, day: DateKey): JournalEntry | undefined {
  return Object.prototype.hasOwnProperty.call(data.journal, day) ? data.journal[day] : undefined;
}

export const canEditJournal = (day: DateKey, today: DateKey) => day === today || day === addDays(today, -1);

/** En dag uten humør og uten tekst har ingen oppføring. */
function put(data: Data, day: DateKey, entry: JournalEntry): Data {
  const journal = { ...data.journal };
  if (entry.mood === null && !entry.text.trim()) delete journal[day];
  else journal[day] = entry;
  return { ...data, journal };
}

/** Velg humør. Samme humør en gang til tar det bort. */
export function setMood(data: Data, day: DateKey, mood: Mood): Data {
  const current = journalOn(data, day) ?? { mood: null, text: '' };
  return put(data, day, { ...current, mood: current.mood === mood ? null : mood });
}

export function setJournalText(data: Data, day: DateKey, text: string): Data {
  const current = journalOn(data, day) ?? { mood: null, text: '' };
  return put(data, day, { ...current, text: text.replace(/\s*\n\s*/g, ' ').slice(0, MAX_JOURNAL_TEXT) });
}

/** Fargestyrken i rutenettet: et svakt humør er en svak farge. Ingen oppføring er tom. */
export function moodFraction(entry: JournalEntry | undefined): number {
  return entry?.mood ? entry.mood / 5 : 0;
}

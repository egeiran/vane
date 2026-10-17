import type { DateKey } from './dates';

export type ColorKey = 'salvie' | 'himmel' | 'lavendel' | 'fersken' | 'sand' | 'rose';

/**
 * - `daily`: hver dag
 * - `days`: valgte ukedager (mandag = indeks 0)
 * - `weekly`: et antall ganger per uke, uansett hvilke dager
 */
export type Schedule =
  | { kind: 'daily' }
  | { kind: 'days'; days: boolean[] }
  | { kind: 'weekly'; times: number };

export type Habit = {
  id: string;
  name: string;
  color: ColorKey;
  /** `check` = ja/nei, `count` = antall per dag (ukentlige vaner er alltid `check`). */
  type: 'check' | 'count';
  /** Mål per dag for `count`, ellers 1. */
  target: number;
  unit: string;
  schedule: Schedule;
  /** Klokkeslett 'HH:MM' for påminnelse, eller null. */
  reminder: string | null;
  createdAt: DateKey;
};

export type HabitInput = Omit<Habit, 'id' | 'createdAt'>;

export type Goal = {
  id: string;
  text: string;
  done: boolean;
};

export type Settings = {
  morningEnabled: boolean;
  morningTime: string;
  remindersEnabled: boolean;
};

/** Verdi per vane for én dag: 1 for gjort (ja/nei) eller antall. */
export type DayLog = Record<string, number>;

export type Data = {
  habits: Habit[];
  logs: Record<DateKey, DayLog>;
  goals: Record<DateKey, Goal[]>;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  morningEnabled: true,
  morningTime: '07:00',
  remindersEnabled: true,
};

export const EMPTY_DATA: Data = {
  habits: [],
  logs: {},
  goals: {},
  settings: DEFAULT_SETTINGS,
};

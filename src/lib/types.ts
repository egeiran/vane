import type { SFSymbol } from 'sf-symbols-typescript';

import type { DateKey } from './dates';

/** `skifer` er en nøytral grå som bare brukes til kategorier. */
export type ColorKey = 'salvie' | 'himmel' | 'lavendel' | 'fersken' | 'sand' | 'rose' | 'skifer';

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
  /** Dager der man har svart «Ikke i dag» på dagens mål – da spør vi ikke mer. */
  goalsSkipped: Record<DateKey, true>;
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
  goalsSkipped: {},
  settings: DEFAULT_SETTINGS,
};

export type Category = {
  id: string;
  name: string;
  icon: SFSymbol;
  color: ColorKey;
  /** Skjulte kategorier er borte fra valgene, men gamle kjøp beholder dem. */
  hidden: boolean;
};

/** Et kjøp i én kategori har én del. Et oppdelt kjøp har flere, som til sammen er hele beløpet. */
export type PurchasePart = { categoryId: string; amount: number };

export type Purchase = {
  id: string;
  /** I øre, alltid positivt. 0 når beløpet ikke kunne leses. */
  amount: number;
  /** 'NOK', 'EUR' osv. Bare kroner telles med i summene. */
  currency: string;
  /** Stedet, ryddet. Et eget navn på stedet ligger i `MoneyData.merchants` og går foran. */
  merchant: string;
  /** Stedet huskes under denne nøkkelen (se `merchantKey`). */
  merchantKey: string;
  day: DateKey;
  /** 'HH:MM' */
  time: string;
  /** Tom betyr at kjøpet venter på kategori. */
  parts: PurchasePart[];
  /** «Ikke tell med», for eksempel et utlegg man får tilbake. Teller ikke og venter ikke. */
  skipped: boolean;
  note: string;
  source: 'applepay' | 'manual';
};

/** Det Vane husker om et sted: et eget navn og kategorien man valgte sist. */
export type MerchantMemory = { name?: string; categoryId?: string };

export type MoneyData = {
  /** I rekkefølgen de vises. */
  categories: Category[];
  /** Nyeste først. */
  purchases: Purchase[];
  merchants: Record<string, MerchantMemory>;
  /** ID-ene til de siste kjøpene som er tatt inn fra Snarveier, så ingen kommer inn to ganger. */
  imported: string[];
  /** Veiviseren for Snarveier er vist. */
  setupSeen: boolean;
};

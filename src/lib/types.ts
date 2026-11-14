import type { SFSymbol } from 'sf-symbols-typescript';

import type { DateKey, WeekStart } from './dates';

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

/**
 * Delene av appen man velger selv. Vanene er alltid med. Penger, dagbok og humør (#19), faste
 * utgifter (#21) og mat finnes. Faste utgifter ligger i Penger, og vises bare når Penger også er på
 * (`recurringOn`). Apple Helse (#20) kommer senere.
 */
export type Modules = {
  money: boolean;
  journal: boolean;
  health: boolean;
  recurring: boolean;
  /** Mat: protein (og kalorier) per dag, med egen lagring (`foodStore.ts`). */
  food: boolean;
};

export type Settings = {
  morningEnabled: boolean;
  morningTime: string;
  remindersEnabled: boolean;
  /** Mandag eller søndag. `null` betyr som telefonen (se `weekStartOf`). */
  weekStart: WeekStart | null;
  /** Ingen data slettes når en modul slås av. */
  modules: Modules;
  /** Oppstarten er vist (eller hoppet over). Alle som brukte appen før oppstarten fantes, har `true`. */
  onboarded: boolean;
  /** Kveldsvarselet for dagboken: «Hvordan var dagen?». Av som standard, og bare når dagboken er på. */
  eveningEnabled: boolean;
  eveningTime: string;
};

/** Humøret en dag, fra tungt (1) til veldig godt (5). */
export type Mood = 1 | 2 | 3 | 4 | 5;

/** Dagboken for én dag: én setning og ett humør. Begge kan mangle. */
export type JournalEntry = { mood: Mood | null; text: string };

/** Verdi per vane for én dag: 1 for gjort (ja/nei) eller antall. */
export type DayLog = Record<string, number>;

export type Data = {
  habits: Habit[];
  logs: Record<DateKey, DayLog>;
  goals: Record<DateKey, Goal[]>;
  /** Dager der man har svart «Ikke i dag» på dagens mål – da spør vi ikke mer. */
  goalsSkipped: Record<DateKey, true>;
  /** Dagbok og humør (modulen `journal`). Dagens setning og humør, per dag. */
  journal: Record<DateKey, JournalEntry>;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  morningEnabled: true,
  morningTime: '07:00',
  remindersEnabled: true,
  weekStart: null,
  // Penger er på for alle som brukte appen før moduler fantes. Nye brukere velger i oppstarten.
  modules: { money: true, journal: false, health: false, recurring: false, food: false },
  onboarded: false,
  eveningEnabled: false,
  eveningTime: '21:00',
};

export const EMPTY_DATA: Data = {
  habits: [],
  logs: {},
  goals: {},
  goalsSkipped: {},
  journal: {},
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
  /** 'NOK', 'EUR' osv. Bare hovedvalutaen telles med i summene. */
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

export type RecurringFrequency = 'week' | 'month' | 'year';

/**
 * En fast utgift: husleie, strøm, et abonnement. Den telles ikke med i kjøpene, så ingenting telles
 * to ganger. Neste trekk regnes ut fra `anchor` (se `nextCharge`), så den 31. ikke flytter seg.
 */
export type RecurringExpense = {
  id: string;
  name: string;
  /** I øre, større enn 0. */
  amount: number;
  /** Hovedvalutaen da den ble lagt inn. Bare hovedvalutaen telles med i summen. */
  currency: string;
  frequency: RecurringFrequency;
  /** En dag det trekkes. */
  anchor: DateKey;
  categoryId: string | null;
  note: string;
  /** Varsel dagen før neste trekk. Av som standard. */
  remind: boolean;
  /** Stedet fra kjøpene, når den ble lagt inn fra et forslag. Ellers tom. */
  merchantKey: string;
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
  /**
   * Hovedvalutaen: den som telles i summene, og som et beløp uten valuta får. `null` betyr som
   * telefonen (se `mainCurrency`).
   */
  currency: string | null;
  /** Faste utgifter (modulen `recurring`), i rekkefølgen de ble lagt inn. */
  recurring: RecurringExpense[];
  /** Steder man har sagt «Ikke foreslå» til, så de ikke foreslås som fast utgift igjen. */
  recurringDismissed: string[];
};

/**
 * Et måltid i matloggen: frokost, lunsj … Standardmåltidene lagres med norske navn og vises på
 * brukerens språk så lenge de ikke har fått nytt navn (`mealName`).
 */
export type Meal = {
  id: string;
  name: string;
  /** Tidsrommet måltidet foreslås i, 'HH:MM'. Uten tidsrom (`null`) er det måltidet for resten av dagen. */
  start: string | null;
  end: string | null;
  /** «Har du logget lunsj?» når tidsrommet er over og ingenting er logget. Av som standard. */
  remind: boolean;
  /** Skjulte måltider er borte fra valgene, men gamle føringer beholder dem. */
  hidden: boolean;
};

/** Protein i tideler gram (heltall, som øre), kcal i hele kcal. `kcal` er `null` når den ikke er oppgitt. */
export type Nutrients = { protein: number; kcal: number | null };

/** En porsjon: «1 stk», «1 beger». `grams` er `null` når man ikke vet vekten. */
export type Portion = { label: string; grams: number | null };

/** En matvare man har laget selv, eller kopiert fra Matvaretabellen. */
export type Food = {
  id: string;
  name: string;
  /** Én porsjon og hva den inneholder. */
  portion: Portion & Nutrients;
  /** Per 100 g, valgfritt. Med den kan matvaren logges i gram. */
  per100: Nutrients | null;
  /** Matvaren i Matvaretabellen den er kopiert fra, ellers `null`. */
  mvtId: string | null;
};

/**
 * Hvor mye man spiste: gram, eller et antall porsjoner. En porsjon har med seg navnet og vekten, så
 * føringen kan vises uten å slå opp matvaren.
 */
export type Amount = { kind: 'grams'; grams: number } | { kind: 'portion'; count: number; label: string; grams: number | null };

/** Hvor en føring kom fra: en egen matvare, Matvaretabellen eller en rett. */
export type FoodRef = { kind: 'food' | 'mvt' | 'dish'; id: string };

/** En del av en rett. Tallene huskes, så retten virker også når matvaren er endret eller slettet. */
export type DishItem = Nutrients & { name: string; ref: FoodRef | null; amount: Amount | null };

/** En rett: flere ting man ofte spiser sammen, logget med ett trykk. */
export type Dish = { id: string; name: string; items: DishItem[] };

/**
 * Én ting man har spist. Tallene er de fra da den ble logget, som et kjøp: de endres ikke når
 * matvaren endres. `ref` er `null` for et raskt tall.
 */
export type FoodEntry = Nutrients & {
  id: string;
  /** 'HH:MM' */
  time: string;
  mealId: string;
  name: string;
  ref: FoodRef | null;
  amount: Amount | null;
};

/** Proteinmålet fra og med en dag. Endres målet, beholder eldre dager målet de hadde. */
export type ProteinGoal = { from: DateKey; grams: number };

export type FoodData = {
  /** Eldste først. Tom til målet er satt første gang. */
  goals: ProteinGoal[];
  /** Kalorier vises. Av skjuler alle kcal-tall, men de lagres fortsatt. */
  showKcal: boolean;
  /** I rekkefølgen de vises. */
  meals: Meal[];
  foods: Food[];
  dishes: Dish[];
  /** Føringene per dag, sortert etter klokkeslett. */
  entries: Record<DateKey, FoodEntry[]>;
  /** Mengden man brukte sist, per matvare (`refKey`). */
  lastAmount: Record<string, Amount>;
  /** Kveldssjekken: «92 av 140 g protein i dag». Bare når man er under målet. Av som standard. */
  eveningEnabled: boolean;
  eveningTime: string;
};

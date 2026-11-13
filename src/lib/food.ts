import { getLang, stringsFor, tr, type Lang } from '@/i18n';

import { addDays, atTime, compareKeys, formatTime, parseTime, todayKey, type DateKey } from './dates';
import { isEditable } from './habits';
import type { Amount, Dish, Food, FoodData, FoodEntry, FoodRef, Meal, Nutrients, Portion, Settings } from './types';

/**
 * Mat: protein (og kalorier) per dag. Ren logikk; lagringen ligger i `foodStore.ts` og
 * reduserne i `foodState.ts`.
 *
 * Protein lagres i tideler gram (heltall, som øre), kcal i hele kcal. Proteinet har et mål per dag,
 * kaloriene bare en sum. Ingen streaks, ingen snitt og ingen rødfarge: Vane viser hva man har spist,
 * ikke hva man burde ha spist. Som for vanene kan bare i dag og i går endres.
 */

/** Protein lagres i tideler gram. */
export const PROTEIN_SCALE = 10;

/** Proteinmålet kan være fra 1 til 500 g. */
export const MAX_GOAL = 500;

/** Gram protein (kan ha desimaler) som tideler gram. */
export const toProtein = (grams: number) => Math.round(grams * PROTEIN_SCALE);

/** Hele gram protein. */
export const proteinGrams = (protein: number) => Math.round(protein / PROTEIN_SCALE);

export const canEditFood = isEditable;

/**
 * Standardmåltidene lagres med norske navn, som standardkategoriene i Penger. Mellommåltid har ikke
 * tidsrom: det er måltidet for resten av dagen.
 */
export const DEFAULT_MEALS: Meal[] = [
  { id: 'frokost', name: 'Frokost', start: '06:00', end: '10:00', remind: false, hidden: false },
  { id: 'lunsj', name: 'Lunsj', start: '11:00', end: '13:00', remind: false, hidden: false },
  { id: 'middag', name: 'Middag', start: '16:00', end: '19:00', remind: false, hidden: false },
  { id: 'kveldsmat', name: 'Kveldsmat', start: '20:00', end: '22:00', remind: false, hidden: false },
  { id: 'mellom', name: 'Mellommåltid', start: null, end: null, remind: false, hidden: false },
];

export const EMPTY_FOOD: FoodData = {
  goals: [],
  showKcal: true,
  meals: DEFAULT_MEALS,
  foods: [],
  dishes: [],
  entries: {},
  lastAmount: {},
  eveningEnabled: false,
  eveningTime: '20:00',
};

export const foodOn = (s: Pick<Settings, 'modules'>) => !!s.modules.food;

/** Navnet på et måltid slik brukeren skal se det: oversatt for standardmåltider som ikke har fått nytt navn. */
export function mealName(m: Pick<Meal, 'id' | 'name'>): string {
  const original = stringsFor('nb').defaultMeals[m.id];
  return original !== undefined && m.name === original ? (tr.defaultMeals[m.id] ?? m.name) : m.name;
}

export function visibleMeals(data: Pick<FoodData, 'meals'>): Meal[] {
  return data.meals.filter((m) => !m.hidden);
}

export function mealById(data: Pick<FoodData, 'meals'>, id: string): Meal | undefined {
  return data.meals.find((m) => m.id === id);
}

const minutes = (time: string) => {
  const t = parseTime(time);
  return t.hour * 60 + t.minute;
};

const inWindow = (m: Meal, time: string) =>
  m.start !== null && m.end !== null && minutes(m.start) <= minutes(time) && minutes(time) < minutes(m.end);

/**
 * Måltidet som passer klokkeslettet: det som har tidsrommet, ellers måltidet uten tidsrom
 * (mellommåltid), ellers det siste som har startet. Bare synlige måltider.
 */
export function suggestMeal(meals: Meal[], time: string): Meal | undefined {
  const visible = meals.filter((m) => !m.hidden);
  const hit = visible.find((m) => inWindow(m, time));
  if (hit) return hit;
  const rest = visible.find((m) => m.start === null);
  if (rest) return rest;
  const started = visible.filter((m) => m.start !== null && minutes(m.start) <= minutes(time));
  return started.sort((a, b) => minutes(b.start!) - minutes(a.start!))[0] ?? visible[0];
}

/** Klokkeslettet en ny føring får: nå for i dag, ellers starten på måltidet (eller kl. 12). */
export function entryTime(day: DateKey, meal: Meal | undefined, now: Date = new Date()): string {
  if (day === todayKey(now)) return formatTime({ hour: now.getHours(), minute: now.getMinutes() });
  return meal?.start ?? '12:00';
}

// ---------------------------------------------------------------------------------------------
// Mål og summer

/** Proteinmålet (gram) som gjaldt den dagen. Dager før første mål får det første. `null` uten mål. */
export function goalOn(data: Pick<FoodData, 'goals'>, day: DateKey): number | null {
  if (!data.goals.length) return null;
  let goal = data.goals[0].grams;
  for (const g of data.goals) {
    if (compareKeys(g.from, day) <= 0) goal = g.grams;
    else break;
  }
  return goal;
}

/** Det nyeste målet, for skjemaet. */
export function currentGoal(data: Pick<FoodData, 'goals'>): number | null {
  return data.goals.length ? data.goals[data.goals.length - 1].grams : null;
}

const NO_ENTRIES: FoodEntry[] = [];

export function entriesOn(data: Pick<FoodData, 'entries'>, day: DateKey): FoodEntry[] {
  return Object.prototype.hasOwnProperty.call(data.entries, day) ? data.entries[day] : NO_ENTRIES;
}

export type Totals = { protein: number; kcal: number; count: number };

export function sumEntries(entries: FoodEntry[]): Totals {
  let protein = 0;
  let kcal = 0;
  for (const e of entries) {
    protein += e.protein;
    kcal += e.kcal ?? 0;
  }
  return { protein, kcal, count: entries.length };
}

export function dayTotals(data: Pick<FoodData, 'entries'>, day: DateKey): Totals {
  return sumEntries(entriesOn(data, day));
}

/** Hvor nær målet dagen var, 0–1. `null` uten mål. En dag uten føringer er 0. */
export function fractionOn(data: Pick<FoodData, 'entries' | 'goals'>, day: DateKey): number | null {
  const goal = goalOn(data, day);
  if (!goal) return null;
  return Math.min(dayTotals(data, day).protein / (goal * PROTEIN_SCALE), 1);
}

export type MealGroup = { meal: Meal; entries: FoodEntry[]; totals: Totals };

/**
 * Dagens føringer per måltid, i måltidenes rekkefølge. Skjulte måltider er med når de har føringer,
 * og føringer i et måltid som ikke finnes lenger, havner i et eget måltid til slutt.
 */
export function mealGroups(data: Pick<FoodData, 'entries' | 'meals'>, day: DateKey): MealGroup[] {
  const entries = entriesOn(data, day);
  const groups: MealGroup[] = [];
  for (const meal of data.meals) {
    const list = entries.filter((e) => e.mealId === meal.id);
    if (meal.hidden && !list.length) continue;
    groups.push({ meal, entries: list, totals: sumEntries(list) });
  }
  const known = new Set(data.meals.map((m) => m.id));
  const orphans = entries.filter((e) => !known.has(e.mealId));
  if (orphans.length) {
    const meal: Meal = { id: orphans[0].mealId, name: tr.food.otherMeal, start: null, end: null, remind: false, hidden: false };
    groups.push({ meal, entries: orphans, totals: sumEntries(orphans) });
  }
  return groups;
}

// ---------------------------------------------------------------------------------------------
// Mengder og næring

/** Det en mengde regnes ut fra: næring per 100 g og/eller én porsjon. */
export type Source = { per100: Nutrients | null; portion: (Portion & Nutrients) | null };

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return { protein: Math.round(n.protein * factor), kcal: n.kcal === null ? null : Math.round(n.kcal * factor) };
}

/**
 * Næringen i en mengde. Porsjoner bruker tallene for porsjonen når kilden har en (det man skrev av
 * pakken), ellers vekten og tallene per 100 g. Gram bruker tallene per 100 g, ellers porsjonens vekt.
 * `null` når mengden ikke kan regnes ut.
 */
export function nutrientsFor(source: Source, amount: Amount): Nutrients | null {
  if (amount.kind === 'portion') {
    if (amount.count <= 0) return null;
    if (source.portion && (amount.label === source.portion.label || !source.per100 || amount.grams === null)) {
      return scaleNutrients(source.portion, amount.count);
    }
    if (source.per100 && amount.grams !== null) return scaleNutrients(source.per100, (amount.grams * amount.count) / 100);
    return null;
  }
  if (amount.grams <= 0) return null;
  if (source.per100) return scaleNutrients(source.per100, amount.grams / 100);
  if (source.portion?.grams) return scaleNutrients(source.portion, amount.grams / source.portion.grams);
  return null;
}

export const foodSource = (f: Food): Source => ({ per100: f.per100, portion: f.portion });

export function dishTotals(d: Pick<Dish, 'items'>): Nutrients {
  let protein = 0;
  let kcal: number | null = null;
  for (const i of d.items) {
    protein += i.protein;
    if (i.kcal !== null) kcal = (kcal ?? 0) + i.kcal;
  }
  return { protein, kcal };
}

export const dishSource = (d: Dish): Source => ({ per100: null, portion: { label: '', grams: null, ...dishTotals(d) } });

/** Kan logges i gram: har tall per 100 g, eller en porsjon med vekt. */
export const takesGrams = (s: Source) => !!s.per100 || !!s.portion?.grams;

export const refKey = (r: FoodRef) => `${r.kind}:${r.id}`;

/** Én porsjon av en matvare eller rett. */
export function onePortion(source: Source): Amount {
  if (source.portion) return { kind: 'portion', count: 1, label: source.portion.label, grams: source.portion.grams };
  return { kind: 'grams', grams: 100 };
}

// ---------------------------------------------------------------------------------------------
// Tekst

const NBSP = ' ';

/** «1 420» / «1,420», «12,5» / «12.5». */
export function formatNumber(n: number, decimals = 0, lang: Lang = getLang()): string {
  const fixed = n.toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = sign ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : NBSP);
  const fraction = frac && Number(frac) !== 0 ? `${lang === 'en' ? '.' : ','}${frac.replace(/0+$/, '')}` : '';
  return `${sign}${grouped}${fraction}`;
}

/** «92 g». Med `precise` får tall under 10 én desimal: «1,3 g». */
export function proteinText(protein: number, precise = false): string {
  const grams = protein / PROTEIN_SCALE;
  return `${formatNumber(precise && grams < 10 ? grams : Math.round(grams), precise && grams < 10 ? 1 : 0)}${NBSP}g`;
}

/** Bare tallet: «92». */
export const proteinNumber = (protein: number) => formatNumber(proteinGrams(protein));

export const kcalText = (kcal: number) => `${formatNumber(kcal)}${NBSP}kcal`;

/** Et tall fra et tekstfelt: «17,5» og «17.5» er det samme. Tomt eller ugyldig gir `null`. */
export function parseDecimal(text: string): number | null {
  const s = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!s || !/^\d*\.?\d*$/.test(s) || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Et tall slik det står i et tekstfelt: «17,5» (på engelsk «17.5»), uten mellomrom. */
export function decimalInput(n: number | null, lang: Lang = getLang()): string {
  if (n === null) return '';
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace('.', lang === 'en' ? '.' : ',');
}

/** Protein (tideler gram) fra et tekstfelt i gram. */
export function parseProtein(text: string): number | null {
  const n = parseDecimal(text);
  return n === null ? null : toProtein(n);
}

/** kcal fra et tekstfelt. */
export function parseKcal(text: string): number | null {
  const n = parseDecimal(text);
  return n === null ? null : Math.round(n);
}

/** «½», «1», «1½», «2,25». */
export function countText(count: number): string {
  const whole = Math.floor(count);
  const frac = count - whole;
  if (Math.abs(frac - 0.5) < 1e-9) return whole ? `${whole}½` : '½';
  return formatNumber(count, 2);
}

/** «150 g», «1 stk», «1½ beger», «2 porsjoner». */
export function amountText(amount: Amount): string {
  if (amount.kind === 'grams') return `${formatNumber(amount.grams)}${NBSP}g`;
  if (!amount.label) return tr.food.portions(countText(amount.count), amount.count);
  return `${countText(amount.count)} ${amount.label}`;
}

// ---------------------------------------------------------------------------------------------
// Forslag

/** Så mange dager bakover forslagene ser. */
export const SUGGESTION_DAYS = 30;

export type Suggestion = {
  key: string;
  name: string;
  /** `null` for et raskt tall med navn. */
  ref: FoodRef | null;
  /** Mengden man brukte sist (for raske tall: tallene). */
  amount: Amount | null;
  nutrients: Nutrients;
};

/**
 * Det man spiser oftest i dette måltidet de siste 30 dagene, så det man har spist oftest ellers.
 * Like mange ganger: det man spiste sist, først. Raske tall med navn er med, med de samme tallene.
 * Matvarer og retter som er slettet, er ikke med.
 */
export function suggestions(data: FoodData, mealId: string, today: DateKey, limit = 8): Suggestion[] {
  type Score = { s: Suggestion; inMeal: number; other: number; last: string };
  const scores = new Map<string, Score>();
  const foods = new Set(data.foods.map((f) => f.id));
  const dishes = new Set(data.dishes.map((d) => d.id));
  for (let i = 0; i < SUGGESTION_DAYS; i++) {
    const day = addDays(today, -i);
    for (const e of entriesOn(data, day)) {
      if (e.ref?.kind === 'food' && !foods.has(e.ref.id)) continue;
      if (e.ref?.kind === 'dish' && !dishes.has(e.ref.id)) continue;
      if (!e.ref && !e.name.trim()) continue;
      const key = e.ref ? refKey(e.ref) : `quick:${e.name.trim().toLowerCase()}:${e.protein}:${e.kcal ?? ''}`;
      const stamp = `${day} ${e.time}`;
      let score = scores.get(key);
      if (!score) {
        score = { s: { key, name: e.name, ref: e.ref, amount: e.amount, nutrients: { protein: e.protein, kcal: e.kcal } }, inMeal: 0, other: 0, last: '' };
        scores.set(key, score);
      }
      if (e.mealId === mealId) score.inMeal++;
      else score.other++;
      if (stamp > score.last) {
        score.last = stamp;
        score.s = { ...score.s, name: e.name, amount: e.amount, nutrients: { protein: e.protein, kcal: e.kcal } };
      }
    }
  }
  return [...scores.values()]
    .sort((a, b) => b.inMeal - a.inMeal || b.other - a.other || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0))
    .slice(0, limit)
    .map((x) => {
      // Navnet og mengden fra matvaren eller retten slik de er nå, når de finnes.
      const s = x.s;
      if (s.ref?.kind === 'food') {
        const f = data.foods.find((f) => f.id === s.ref!.id)!;
        return { ...s, name: f.name, amount: data.lastAmount[s.key] ?? s.amount };
      }
      if (s.ref?.kind === 'dish') {
        const d = data.dishes.find((d) => d.id === s.ref!.id)!;
        return { ...s, name: d.name, amount: data.lastAmount[s.key] ?? s.amount };
      }
      if (s.ref) return { ...s, amount: data.lastAmount[s.key] ?? s.amount };
      return s;
    });
}

/** Det som ble logget i samme måltid dagen før («Som i går»). */
export function previousMeal(data: Pick<FoodData, 'entries'>, day: DateKey, mealId: string): FoodEntry[] {
  return entriesOn(data, addDays(day, -1)).filter((e) => e.mealId === mealId);
}

// ---------------------------------------------------------------------------------------------
// Varsler

/** Matvarslene legges inn for i dag og så mange dager fram. Appen fyller på når den åpnes. */
export const FOOD_DAYS_AHEAD = 3;

export type PlannedFoodReminder = {
  id: string;
  date: Date;
  title: string;
  body: string;
  data: { kind: 'food'; day: DateKey; mealId?: string };
};

/** Varsel for måltider kan bare legges på et måltid med tidsrom. */
export const canRemindMeal = (m: Meal) => m.start !== null && m.end !== null;

/**
 * Kveldssjekken og «Har du logget lunsj?» for i dag og de to neste dagene. Kveldssjekken kommer bare
 * når man er under målet, og måltidsvarselet bare når ingenting er logget i måltidet. Begge regnes ut
 * på nytt hver gang noe logges, så teksten stemmer med det man har spist.
 */
export function planFoodReminders(data: FoodData, settings: Pick<Settings, 'modules'>, now: Date = new Date()): PlannedFoodReminder[] {
  if (!foodOn(settings)) return [];
  const today = todayKey(now);
  const out: PlannedFoodReminder[] = [];
  for (let i = 0; i < FOOD_DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const entries = entriesOn(data, day);
    for (const m of visibleMeals(data)) {
      if (!m.remind || !canRemindMeal(m)) continue;
      const date = atTime(day, m.end!);
      if (date.getTime() <= now.getTime()) continue;
      if (entries.some((e) => e.mealId === m.id)) continue;
      out.push({
        id: `food:meal:${m.id}:${day}`,
        date,
        title: tr.notifications.mealTitle(mealName(m)),
        body: tr.notifications.mealBody,
        data: { kind: 'food', day, mealId: m.id },
      });
    }
    const goal = goalOn(data, day);
    if (data.eveningEnabled && goal) {
      const date = atTime(day, data.eveningTime);
      const protein = sumEntries(entries).protein;
      if (date.getTime() > now.getTime() && protein < goal * PROTEIN_SCALE) {
        out.push({
          id: `food:evening:${day}`,
          date,
          title: tr.notifications.foodEveningTitle,
          body: protein ? tr.notifications.foodEveningBody(proteinNumber(protein), String(goal)) : tr.notifications.foodEveningEmpty(String(goal)),
          data: { kind: 'food', day },
        });
      }
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ---------------------------------------------------------------------------------------------
// CSV

/** Én linje per føring: dato, klokkeslett, måltid, navn, mengde, protein (g), kcal. Eldste først. */
export function foodRows(data: FoodData): string[][] {
  const rows: string[][] = [];
  const days = Object.keys(data.entries).sort(compareKeys);
  for (const day of days) {
    for (const e of data.entries[day]) {
      const meal = mealById(data, e.mealId);
      rows.push([
        day,
        e.time,
        meal ? mealName(meal) : '',
        e.name,
        e.amount ? amountText(e.amount) : '',
        (e.protein / PROTEIN_SCALE).toFixed(1),
        e.kcal === null ? '' : String(e.kcal),
      ]);
    }
  }
  return rows;
}

import { addDays, compareKeys, type DateKey } from './dates';
import { DEFAULT_MEALS, EMPTY_FOOD, entriesOn, MAX_GOAL, refKey } from './food';
import type { Dish, Food, FoodData, FoodEntry, Meal, ProteinGoal } from './types';

/** Rene funksjoner for maten. Lagringen ligger i foodStore.ts. */

/** Navn på matvarer, retter og måltider. */
export const MAX_FOOD_NAME = 80;

/**
 * Matdataene slik de lastes fra telefonen eller en sikkerhetskopi. Det som mangler, får
 * standardverdien, og standardmåltidene er alltid med (et standardmåltid man ikke vil ha, skjules).
 */
export function loadFood(persisted: unknown): FoodData {
  const p = (persisted ?? {}) as Partial<FoodData>;
  const meals = p.meals?.length ? p.meals : DEFAULT_MEALS;
  return {
    ...EMPTY_FOOD,
    ...p,
    goals: p.goals ?? [],
    meals,
    foods: p.foods ?? [],
    dishes: p.dishes ?? [],
    entries: p.entries ?? {},
    lastAmount: p.lastAmount ?? {},
  };
}

const byTime = (a: FoodEntry, b: FoodEntry) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0);

function putDay(data: FoodData, day: DateKey, list: FoodEntry[]): FoodData {
  const entries = { ...data.entries };
  if (list.length) entries[day] = [...list].sort(byTime);
  else delete entries[day];
  return { ...data, entries };
}

const dayList = entriesOn;

/**
 * Målet fra og med `today`. Eldre dager beholder målet de hadde. Endres målet flere ganger samme dag,
 * gjelder det siste.
 */
export function setGoal(data: FoodData, grams: number, today: DateKey): FoodData {
  const value = Math.min(MAX_GOAL, Math.max(1, Math.round(grams)));
  const kept = data.goals.filter((g) => compareKeys(g.from, today) < 0);
  const last = kept[kept.length - 1];
  // Samme mål som før trenger ingen ny linje.
  const goals: ProteinGoal[] = last?.grams === value ? kept : [...kept, { from: today, grams: value }];
  return { ...data, goals };
}

export type EntryInput = Omit<FoodEntry, 'id'>;

/** Legger til en føring og husker mengden for matvaren. */
export function addEntry(data: FoodData, day: DateKey, input: EntryInput, id: string): FoodData {
  const next = putDay(data, day, [...dayList(data, day), { ...input, name: input.name.trim(), id }]);
  return input.ref && input.amount ? { ...next, lastAmount: { ...next.lastAmount, [refKey(input.ref)]: input.amount } } : next;
}

export function updateEntry(data: FoodData, day: DateKey, id: string, patch: Partial<Omit<FoodEntry, 'id'>>): FoodData {
  const list = dayList(data, day);
  const current = list.find((e) => e.id === id);
  if (!current) return data;
  const updated = { ...current, ...patch };
  const next = putDay(
    data,
    day,
    list.map((e) => (e.id === id ? updated : e))
  );
  return updated.ref && updated.amount && patch.amount ? { ...next, lastAmount: { ...next.lastAmount, [refKey(updated.ref)]: updated.amount } } : next;
}

export function removeEntry(data: FoodData, day: DateKey, id: string): FoodData {
  const list = dayList(data, day);
  if (!list.some((e) => e.id === id)) return data;
  return putDay(
    data,
    day,
    list.filter((e) => e.id !== id)
  );
}

/** «Som i går»: kopierer måltidet fra dagen før, med nye ID-er og klokkeslett. */
export function copyMeal(data: FoodData, day: DateKey, mealId: string, time: string, ids: string[]): FoodData {
  const from = dayList(data, addDays(day, -1)).filter((e) => e.mealId === mealId);
  if (!from.length) return data;
  const copies = from.map((e, i) => ({ ...e, id: ids[i], time }));
  return putDay(data, day, [...dayList(data, day), ...copies]);
}

export type FoodInput = Omit<Food, 'id'>;

export function addFood(data: FoodData, input: FoodInput, id: string): FoodData {
  return { ...data, foods: [...data.foods, { ...input, name: input.name.trim(), id }] };
}

/** Endrer matvaren. Føringer som allerede er logget, beholder tallene sine. */
export function updateFood(data: FoodData, id: string, input: FoodInput): FoodData {
  const lastAmount = { ...data.lastAmount };
  // En husket porsjon passer kanskje ikke lenger.
  delete lastAmount[refKey({ kind: 'food', id })];
  return { ...data, lastAmount, foods: data.foods.map((f) => (f.id === id ? { ...input, name: input.name.trim(), id } : f)) };
}

export function removeFood(data: FoodData, id: string): FoodData {
  const lastAmount = { ...data.lastAmount };
  delete lastAmount[refKey({ kind: 'food', id })];
  return { ...data, lastAmount, foods: data.foods.filter((f) => f.id !== id) };
}

export type DishInput = Omit<Dish, 'id'>;

export function addDish(data: FoodData, input: DishInput, id: string): FoodData {
  return { ...data, dishes: [...data.dishes, { ...input, name: input.name.trim(), id }] };
}

export function updateDish(data: FoodData, id: string, input: DishInput): FoodData {
  return { ...data, dishes: data.dishes.map((d) => (d.id === id ? { ...input, name: input.name.trim(), id } : d)) };
}

export function removeDish(data: FoodData, id: string): FoodData {
  const lastAmount = { ...data.lastAmount };
  delete lastAmount[refKey({ kind: 'dish', id })];
  return { ...data, lastAmount, dishes: data.dishes.filter((d) => d.id !== id) };
}

export type MealInput = Omit<Meal, 'id' | 'hidden'>;

export function addMeal(data: FoodData, input: MealInput, id: string): FoodData {
  return { ...data, meals: [...data.meals, { ...input, name: input.name.trim(), id, hidden: false }] };
}

export function updateMeal(data: FoodData, id: string, patch: Partial<Omit<Meal, 'id'>>): FoodData {
  return {
    ...data,
    meals: data.meals.map((m) => (m.id === id ? { ...m, ...patch, name: (patch.name ?? m.name).trim() || m.name } : m)),
  };
}

export function moveMeal(data: FoodData, id: string, delta: number): FoodData {
  const i = data.meals.findIndex((m) => m.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= data.meals.length) return data;
  const meals = [...data.meals];
  [meals[i], meals[j]] = [meals[j], meals[i]];
  return { ...data, meals };
}

/**
 * Sletter et eget måltid. Har det føringer, skjules det i stedet, så ingenting mister måltidet sitt.
 * Standardmåltidene kan bare skjules.
 */
export function deleteMeal(data: FoodData, id: string): FoodData {
  const used = Object.values(data.entries).some((list) => list.some((e) => e.mealId === id));
  if (used || DEFAULT_MEALS.some((m) => m.id === id)) return updateMeal(data, id, { hidden: true, remind: false });
  return { ...data, meals: data.meals.filter((m) => m.id !== id) };
}

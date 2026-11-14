import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { DateKey } from './dates';
import { EMPTY_FOOD, foodOn, previousMeal } from './food';
import * as F from './foodState';
import { kvStorage } from './kvStorage';
import { newId } from './state';
import { getData } from './store';
import type { FoodData, FoodEntry, Meal } from './types';

type Actions = {
  setGoal: (grams: number, today: DateKey) => void;
  setShowKcal: (show: boolean) => void;
  setEvening: (patch: Partial<Pick<FoodData, 'eveningEnabled' | 'eveningTime'>>) => void;
  addEntry: (day: DateKey, input: F.EntryInput) => string;
  updateEntry: (day: DateKey, id: string, patch: Partial<Omit<FoodEntry, 'id'>>) => void;
  removeEntry: (day: DateKey, id: string) => void;
  /** «Som i går». Gir ID-ene til føringene som ble lagt til. */
  copyMeal: (day: DateKey, mealId: string, time: string) => string[];
  addFood: (input: F.FoodInput) => string;
  updateFood: (id: string, input: F.FoodInput) => void;
  removeFood: (id: string) => void;
  addDish: (input: F.DishInput) => string;
  updateDish: (id: string, input: F.DishInput) => void;
  removeDish: (id: string) => void;
  addMeal: (input: F.MealInput) => string;
  updateMeal: (id: string, patch: Partial<Omit<Meal, 'id'>>) => void;
  moveMeal: (id: string, delta: number) => void;
  deleteMeal: (id: string) => void;
};

export type FoodStore = FoodData & Actions;

export const pickFood = (s: FoodData): FoodData => ({
  goals: s.goals,
  showKcal: s.showKcal,
  meals: s.meals,
  foods: s.foods,
  dishes: s.dishes,
  entries: s.entries,
  lastAmount: s.lastAmount,
  eveningEnabled: s.eveningEnabled,
  eveningTime: s.eveningTime,
});

/** Maten lagres for seg, som pengene, så mange føringer ikke gjør hver avhuking tregere å lagre. */
export const useFood = create<FoodStore>()(
  persist(
    (set, get) => {
      const apply = (fn: (d: FoodData) => FoodData) => set((s) => fn(pickFood(s)));
      return {
        ...EMPTY_FOOD,
        setGoal: (grams, today) => apply((d) => F.setGoal(d, grams, today)),
        setShowKcal: (showKcal) => apply((d) => ({ ...d, showKcal })),
        setEvening: (patch) => apply((d) => ({ ...d, ...patch })),
        addEntry: (day, input) => {
          const id = newId('e');
          apply((d) => F.addEntry(d, day, input, id));
          return id;
        },
        updateEntry: (day, id, patch) => apply((d) => F.updateEntry(d, day, id, patch)),
        removeEntry: (day, id) => apply((d) => F.removeEntry(d, day, id)),
        copyMeal: (day, mealId, time) => {
          const ids = previousMeal(pickFood(get()), day, mealId).map(() => newId('e'));
          apply((d) => F.copyMeal(d, day, mealId, time, ids));
          return ids;
        },
        addFood: (input) => {
          const id = newId('f');
          apply((d) => F.addFood(d, input, id));
          return id;
        },
        updateFood: (id, input) => apply((d) => F.updateFood(d, id, input)),
        removeFood: (id) => apply((d) => F.removeFood(d, id)),
        addDish: (input) => {
          const id = newId('d');
          apply((d) => F.addDish(d, input, id));
          return id;
        },
        updateDish: (id, input) => apply((d) => F.updateDish(d, id, input)),
        removeDish: (id) => apply((d) => F.removeDish(d, id)),
        addMeal: (input) => {
          const id = newId('m');
          apply((d) => F.addMeal(d, input, id));
          return id;
        },
        updateMeal: (id, patch) => apply((d) => F.updateMeal(d, id, patch)),
        moveMeal: (id, delta) => apply((d) => F.moveMeal(d, id, delta)),
        deleteMeal: (id) => apply((d) => F.deleteMeal(d, id)),
      };
    },
    {
      name: 'vane-mat',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => pickFood(s),
      merge: (persisted, current) => ({ ...current, ...F.loadFood(persisted) }),
    }
  )
);

/** Nåværende matdata uten handlinger, til bruk utenfor React. */
export const getFood = (): FoodData => pickFood(useFood.getState());

/** Erstatter alle matdataene, for eksempel fra en sikkerhetskopi (se `backup.ts`). */
export function replaceFood(food: FoodData) {
  useFood.setState(pickFood(food));
}

/** Alle matdata som et stabilt objekt (rendrer bare på nytt når noe faktisk endres). */
export const useFoodData = (): FoodData => useFood(useShallow(pickFood));

/** Mat-fanen når modulen er på, ellers I dag. Skjemaene lukkes dit når de ikke kan gå tilbake. */
export const foodHome = () => (foodOn(getData().settings) ? ('/food' as const) : ('/' as const));

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { DateKey } from './dates';
import { kvStorage } from './kvStorage';
import * as S from './state';
import { EMPTY_DATA, type Data, type HabitInput, type Settings } from './types';

type Actions = {
  addHabit: (input: HabitInput, today: DateKey) => string;
  updateHabit: (id: string, input: HabitInput) => void;
  deleteHabit: (id: string) => void;
  toggle: (habitId: string, day: DateKey) => void;
  increment: (habitId: string, day: DateKey, delta: number) => void;
  setValue: (habitId: string, day: DateKey, value: number) => void;
  complete: (habitId: string, day: DateKey) => void;
  addGoal: (day: DateKey, text: string) => void;
  toggleGoal: (day: DateKey, id: string) => void;
  removeGoal: (day: DateKey, id: string) => void;
  skipGoals: (day: DateKey) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

export type Store = Data & Actions;

export const pickData = (s: Data): Data => ({
  habits: s.habits,
  logs: s.logs,
  goals: s.goals,
  goalsSkipped: s.goalsSkipped,
  settings: s.settings,
});

export const useStore = create<Store>()(
  persist(
    (set) => {
      const apply = (fn: (d: Data) => Data) => set((s) => fn(pickData(s)));
      return {
        ...EMPTY_DATA,
        addHabit: (input, today) => {
          const id = S.newId('h');
          apply((d) => S.addHabit(d, input, today, id));
          return id;
        },
        updateHabit: (id, input) => apply((d) => S.updateHabit(d, id, input)),
        deleteHabit: (id) => apply((d) => S.deleteHabit(d, id)),
        toggle: (habitId, day) => apply((d) => S.toggleHabit(d, habitId, day)),
        increment: (habitId, day, delta) => apply((d) => S.incrementHabit(d, habitId, day, delta)),
        setValue: (habitId, day, value) => apply((d) => S.setValue(d, habitId, day, value)),
        complete: (habitId, day) => apply((d) => S.completeHabit(d, habitId, day)),
        addGoal: (day, text) => apply((d) => S.addGoal(d, day, text)),
        toggleGoal: (day, id) => apply((d) => S.toggleGoal(d, day, id)),
        removeGoal: (day, id) => apply((d) => S.removeGoal(d, day, id)),
        skipGoals: (day) => apply((d) => S.skipGoals(d, day)),
        updateSettings: (patch) => apply((d) => S.updateSettings(d, patch)),
      };
    },
    {
      name: 'vane-data',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => pickData(s),
      merge: (persisted, current) => ({ ...current, ...S.loadData(persisted) }),
    }
  )
);

/** Erstatter alle dataene, for eksempel fra en sikkerhetskopi (se `backup.ts`). */
export function replaceData(data: Data) {
  useStore.setState(pickData(data));
}

/** Nåværende data uten handlinger, til bruk utenfor React. */
export const getData = (): Data => pickData(useStore.getState());

/** Hvor en Penger-skjerm går når den lukkes og det ikke er noe å gå tilbake til. */
export const moneyHome = () => (getData().settings.modules.money ? ('/money' as const) : ('/' as const));

/** Alle data som et stabilt objekt (rendrer bare på nytt når noe faktisk endres). */
export const useData = (): Data => useStore(useShallow(pickData));

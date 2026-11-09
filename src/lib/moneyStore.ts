import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { kvStorage } from './kvStorage';
import { EMPTY_MONEY } from './money';
import * as M from './moneyState';
import * as R from './recurring';
import { newId } from './state';
import type { Category, MoneyData } from './types';

type Actions = {
  addPurchase: (input: M.PurchaseInput) => string;
  updatePurchase: (id: string, patch: M.PurchasePatch) => void;
  categorize: (id: string, categoryId: string) => void;
  approveSuggestion: (id: string) => void;
  approveAllSuggestions: () => void;
  deletePurchase: (id: string) => void;
  renameMerchant: (key: string, name: string) => void;
  addCategory: (input: M.CategoryInput) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  moveCategory: (id: string, delta: number) => void;
  markSetupSeen: () => void;
  /** Hovedvalutaen, eller `null` for som telefonen. */
  setCurrency: (currency: string | null) => void;
  addRecurring: (input: R.RecurringInput) => string;
  updateRecurring: (id: string, patch: R.RecurringPatch) => void;
  deleteRecurring: (id: string) => void;
  dismissRecurringSuggestion: (key: string) => void;
  /** Kjører en ren funksjon på dataene (brukes for køen fra Swift og svar på varsler). */
  apply: (fn: (d: MoneyData) => MoneyData) => void;
};

export type MoneyStore = MoneyData & Actions;

export const pickMoney = (s: MoneyData): MoneyData => ({
  categories: s.categories,
  purchases: s.purchases,
  merchants: s.merchants,
  imported: s.imported,
  setupSeen: s.setupSeen,
  currency: s.currency,
  recurring: s.recurring,
  recurringDismissed: s.recurringDismissed,
});

/**
 * Pengene lagres for seg, ved siden av vanene (`vane-data`), så mange kjøp ikke gjør hver
 * avhuking tregere å lagre.
 */
export const useMoney = create<MoneyStore>()(
  persist(
    (set) => {
      const apply = (fn: (d: MoneyData) => MoneyData) => set((s) => fn(pickMoney(s)));
      return {
        ...EMPTY_MONEY,
        addPurchase: (input) => {
          const id = newId('p');
          apply((d) => M.addPurchase(d, input, id));
          return id;
        },
        updatePurchase: (id, patch) => apply((d) => M.updatePurchase(d, id, patch)),
        categorize: (id, categoryId) => apply((d) => M.categorize(d, id, categoryId)),
        approveSuggestion: (id) => apply((d) => M.approveSuggestion(d, id)),
        approveAllSuggestions: () => apply(M.approveAllSuggestions),
        deletePurchase: (id) => apply((d) => M.deletePurchase(d, id)),
        renameMerchant: (key, name) => apply((d) => M.renameMerchant(d, key, name)),
        addCategory: (input) => {
          const id = newId('c');
          apply((d) => M.addCategory(d, input, id));
          return id;
        },
        updateCategory: (id, patch) => apply((d) => M.updateCategory(d, id, patch)),
        moveCategory: (id, delta) => apply((d) => M.moveCategory(d, id, delta)),
        markSetupSeen: () => apply(M.markSetupSeen),
        setCurrency: (currency) => apply((d) => ({ ...d, currency })),
        addRecurring: (input) => {
          const id = newId('r');
          apply((d) => R.addRecurring(d, input, id));
          return id;
        },
        updateRecurring: (id, patch) => apply((d) => R.updateRecurring(d, id, patch)),
        deleteRecurring: (id) => apply((d) => R.deleteRecurring(d, id)),
        dismissRecurringSuggestion: (key) => apply((d) => R.dismissSuggestion(d, key)),
        apply,
      };
    },
    {
      name: 'vane-penger',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => pickMoney(s),
      merge: (persisted, current) => ({ ...current, ...M.loadMoney(persisted) }),
    }
  )
);

/** Nåværende pengedata uten handlinger, til bruk utenfor React. */
export const getMoney = (): MoneyData => pickMoney(useMoney.getState());

/** Erstatter alle pengedataene, for eksempel fra en sikkerhetskopi (se `backup.ts`). */
export function replaceMoney(money: MoneyData) {
  useMoney.setState(pickMoney(money));
}

/** Alle pengedata som et stabilt objekt (rendrer bare på nytt når noe faktisk endres). */
export const useMoneyData = (): MoneyData => useMoney(useShallow(pickMoney));

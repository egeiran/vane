import { formatTime, toKey, type DateKey } from './dates';
import { cleanMerchant, isPending, merchantKey, parseAmount, suggestionFor } from './money';
import { newId } from './state';
import type { Category, ColorKey, MoneyData, Purchase, PurchasePart } from './types';

/** Rene funksjoner for pengene. Lagringen ligger i moneyStore.ts. */

/** Så mange kjøp fra Snarveier huskes som tatt inn. Køen i Swift holder uansett bare 100. */
export const MAX_IMPORTED = 500;

const sortKey = (p: Purchase) => `${p.day} ${p.time}`;

/** Nyeste først. Et kjøp med samme tidspunkt som et annet havner foran det. */
function insertSorted(list: Purchase[], p: Purchase): Purchase[] {
  const key = sortKey(p);
  const i = list.findIndex((q) => sortKey(q) <= key);
  return i < 0 ? [...list, p] : [...list.slice(0, i), p, ...list.slice(i)];
}

/** Delene må være hele beløpet: én del med hele beløpet, eller flere positive deler som til sammen blir det. */
export function partsAreValid(amount: number, parts: PurchasePart[]): boolean {
  if (parts.length === 0) return true;
  if (parts.length === 1) return parts[0].amount === amount;
  return parts.every((p) => p.amount > 0) && parts.reduce((sum, p) => sum + p.amount, 0) === amount;
}

/** Husk kategorien for stedet: den største delen. */
function remember(data: MoneyData, p: Purchase): MoneyData {
  if (!p.merchantKey || !p.parts.length) return data;
  const biggest = p.parts.reduce((a, b) => (b.amount > a.amount ? b : a));
  const current = data.merchants[p.merchantKey];
  if (current?.categoryId === biggest.categoryId) return data;
  return { ...data, merchants: { ...data.merchants, [p.merchantKey]: { ...current, categoryId: biggest.categoryId } } };
}

function replace(data: MoneyData, p: Purchase): MoneyData {
  const others = data.purchases.filter((q) => q.id !== p.id);
  return { ...data, purchases: insertSorted(others, p) };
}

export type IncomingPurchase = {
  /** ID-en fra Swift. Den samme brukes i varselet, så kjøpet kan tas inn fra begge steder. */
  id: string;
  /** Beløpet slik Snarveier ga det, for eksempel «kr 149,00». */
  amountText: string;
  /** Stedet slik terminalen sendte det. */
  merchant: string;
  at: Date;
};

/** Tar inn et kjøp fra Apple Pay. Det samme kjøpet tas bare inn én gang, også etter at det er slettet. */
export function importPurchase(data: MoneyData, input: IncomingPurchase): MoneyData {
  if (data.imported.includes(input.id) || data.purchases.some((p) => p.id === input.id)) return data;
  const parsed = parseAmount(input.amountText);
  const raw = input.merchant.trim();
  const purchase: Purchase = {
    id: input.id,
    amount: parsed?.amount ?? 0,
    currency: parsed?.currency ?? 'NOK',
    merchant: cleanMerchant(raw),
    merchantKey: merchantKey(raw),
    day: toKey(input.at),
    time: formatTime({ hour: input.at.getHours(), minute: input.at.getMinutes() }),
    parts: [],
    skipped: false,
    note: '',
    source: 'applepay',
  };
  return {
    ...data,
    purchases: insertSorted(data.purchases, purchase),
    imported: [...data.imported, input.id].slice(-MAX_IMPORTED),
  };
}

export type PurchaseInput = {
  amount: number;
  merchant: string;
  day: DateKey;
  time: string;
  parts: PurchasePart[];
  skipped: boolean;
  note: string;
};

/** Et kjøp lagt inn for hånd: Vipps, kontanter, nettkjøp. Navnet brukes slik det er skrevet. */
export function addPurchase(data: MoneyData, input: PurchaseInput, id = newId('p')): MoneyData {
  if (!partsAreValid(input.amount, input.parts)) return data;
  const name = input.merchant.trim();
  const purchase: Purchase = {
    id,
    amount: input.amount,
    currency: 'NOK',
    merchant: name || 'Ukjent sted',
    merchantKey: merchantKey(name),
    day: input.day,
    time: input.time,
    parts: input.parts,
    skipped: input.skipped,
    note: input.note.trim(),
    source: 'manual',
  };
  return remember(replace(data, purchase), purchase);
}

export type PurchasePatch = Partial<Pick<Purchase, 'amount' | 'day' | 'time' | 'parts' | 'skipped' | 'note'>>;

/**
 * Endrer et kjøp. Endres beløpet på et kjøp med én kategori, følger delen med. Deler som ikke går
 * opp i beløpet, gir ingen endring.
 */
export function updatePurchase(data: MoneyData, id: string, patch: PurchasePatch): MoneyData {
  const current = data.purchases.find((p) => p.id === id);
  if (!current) return data;
  const amount = patch.amount ?? current.amount;
  let parts = patch.parts ?? current.parts;
  if (!patch.parts && parts.length === 1) parts = [{ ...parts[0], amount }];
  if (!partsAreValid(amount, parts)) return data;
  const next: Purchase = { ...current, ...patch, amount, parts, note: (patch.note ?? current.note).trim() };
  const changed = replace(data, next);
  return patch.parts ? remember(changed, next) : changed;
}

/** Hele kjøpet i én kategori. */
export function categorize(data: MoneyData, id: string, categoryId: string): MoneyData {
  const p = data.purchases.find((q) => q.id === id);
  if (!p) return data;
  return updatePurchase(data, id, { parts: [{ categoryId, amount: p.amount }], skipped: false });
}

/** Godkjenner forslaget for et kjøp som venter. */
export function approveSuggestion(data: MoneyData, id: string): MoneyData {
  const p = data.purchases.find((q) => q.id === id);
  const suggestion = p && isPending(p) ? suggestionFor(data, p) : null;
  return suggestion ? categorize(data, id, suggestion.id) : data;
}

/** Godkjenner alle forslag. Kjøp fra nye steder blir stående. */
export function approveAllSuggestions(data: MoneyData): MoneyData {
  let next = data;
  for (const p of data.purchases) if (isPending(p)) next = approveSuggestion(next, p.id);
  return next;
}

export function deletePurchase(data: MoneyData, id: string): MoneyData {
  return { ...data, purchases: data.purchases.filter((p) => p.id !== id) };
}

/** Gir stedet et eget navn, som brukes for alle kjøp derfra. Tomt navn tar bort det egne navnet. */
export function renameMerchant(data: MoneyData, key: string, name: string): MoneyData {
  if (!key) return data;
  const current = data.merchants[key] ?? {};
  const { name: old, ...rest } = current;
  const n = name.trim();
  if (!n && !old) return data;
  return { ...data, merchants: { ...data.merchants, [key]: n ? { ...rest, name: n } : rest } };
}

export type CategoryInput = { name: string; icon: Category['icon']; color: ColorKey };

export function addCategory(data: MoneyData, input: CategoryInput, id = newId('c')): MoneyData {
  const name = input.name.trim();
  if (!name) return data;
  return { ...data, categories: [...data.categories, { ...input, name, id, hidden: false }] };
}

export function updateCategory(data: MoneyData, id: string, patch: Partial<Omit<Category, 'id'>>): MoneyData {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) return data;
  return {
    ...data,
    categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch, ...(name ? { name } : {}) } : c)),
  };
}

/** Flytter en kategori opp (-1) eller ned (+1) i lista. */
export function moveCategory(data: MoneyData, id: string, delta: number): MoneyData {
  const i = data.categories.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= data.categories.length) return data;
  const categories = [...data.categories];
  [categories[i], categories[j]] = [categories[j], categories[i]];
  return { ...data, categories };
}

export function markSetupSeen(data: MoneyData): MoneyData {
  return data.setupSeen ? data : { ...data, setupSeen: true };
}

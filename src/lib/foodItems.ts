import { tr } from '@/i18n';

import { amountText, dishSource, foodSource, nutrientsFor, onePortion, proteinText, refKey, takesGrams, type Source } from './food';
import { tableFood, type TableFood } from './matvaretabellen';
import type { Amount, Dish, Food, FoodData, FoodRef, Nutrients } from './types';

/**
 * Det som kan logges i loggearket: en egen matvare, en rett eller en matvare fra Matvaretabellen.
 * Ren logikk, så loggearket og skjemaet for retter regner likt.
 */
export type LogItem = {
  key: string;
  name: string;
  ref: FoodRef;
  source: Source;
  /** Knappene i mengdepanelet. */
  options: Amount[];
  /** Mengden man brukte sist, ellers den første knappen. */
  amount: Amount;
  /** Undertittel: «1 beger · 17 g» eller «31 g protein per 100 g». */
  sub: string;
};

const HUNDRED: Amount = { kind: 'grams', grams: 100 };

function subFor(source: Source, amount: Amount): string {
  const n = nutrientsFor(source, amount);
  return [amountText(amount), n ? proteinText(n.protein, true) : ''].filter(Boolean).join(' · ');
}

export function foodItem(data: Pick<FoodData, 'lastAmount'>, f: Food): LogItem {
  const ref: FoodRef = { kind: 'food', id: f.id };
  const source = foodSource(f);
  const options = [onePortion(source), ...(takesGrams(source) ? [HUNDRED] : [])];
  const amount = data.lastAmount[refKey(ref)] ?? options[0];
  return { key: refKey(ref), name: f.name, ref, source, options, amount, sub: subFor(source, amount) };
}

export function dishItem(data: Pick<FoodData, 'lastAmount'>, d: Dish): LogItem {
  const ref: FoodRef = { kind: 'dish', id: d.id };
  const source = dishSource(d);
  const options = [onePortion(source)];
  const amount = data.lastAmount[refKey(ref)] ?? options[0];
  return { key: refKey(ref), name: d.name, ref, source, options, amount, sub: [tr.food.dish, subFor(source, amount)].join(' · ') };
}

export function tableItem(data: Pick<FoodData, 'lastAmount'>, f: TableFood): LogItem {
  const ref: FoodRef = { kind: 'mvt', id: f.id };
  const source: Source = { per100: f.per100, portion: null };
  const options: Amount[] = [...f.portions.map((p): Amount => ({ kind: 'portion', count: 1, label: p.label, grams: p.grams })), HUNDRED];
  const remembered = data.lastAmount[refKey(ref)];
  return {
    key: refKey(ref),
    name: f.name,
    ref,
    source,
    options,
    amount: remembered ?? options[0],
    sub: remembered ? subFor(source, remembered) : tr.food.per100(proteinText(f.per100.protein, true)),
  };
}

/** Matvaren, retten eller tabellraden en føring kom fra, hvis den finnes ennå. */
export function itemForRef(data: FoodData, ref: FoodRef): LogItem | null {
  if (ref.kind === 'food') {
    const f = data.foods.find((x) => x.id === ref.id);
    return f ? foodItem(data, f) : null;
  }
  if (ref.kind === 'dish') {
    const d = data.dishes.find((x) => x.id === ref.id);
    return d ? dishItem(data, d) : null;
  }
  const t = tableFood(ref.id);
  return t ? tableItem(data, t) : null;
}

/** Tallene for en mengde, eller `null` når mengden ikke kan regnes ut. */
export const itemNutrients = (item: LogItem, amount: Amount): Nutrients | null => nutrientsFor(item.source, amount);

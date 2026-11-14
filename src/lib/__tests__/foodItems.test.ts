import { describe, expect, it } from '@jest/globals';

import { EMPTY_FOOD } from '../food';
import { dishItem, foodItem, itemForRef, itemNutrients, tableItem } from '../foodItems';
import * as F from '../foodState';
import { tableFood } from '../matvaretabellen';
import type { Food } from '../types';

const SKYR: Food = { id: 'skyr', name: 'Skyr', portion: { label: 'beger', grams: 160, protein: 176, kcal: 99 }, per100: { protein: 110, kcal: 62 }, mvtId: null };
const SHAKE: Food = { id: 'shake', name: 'Proteinshake', portion: { label: 'shaker', grams: null, protein: 400, kcal: 210 }, per100: null, mvtId: null };

describe('det som kan logges', () => {
  it('en egen matvare: én porsjon først, og 100 g når den kan logges i gram', () => {
    const skyr = foodItem(EMPTY_FOOD, SKYR);
    expect(skyr.options).toEqual([
      { kind: 'portion', count: 1, label: 'beger', grams: 160 },
      { kind: 'grams', grams: 100 },
    ]);
    expect(skyr.amount).toEqual(skyr.options[0]);
    expect(skyr.sub).toBe('1 beger · 18 g');
    // Uten vekt og uten tall per 100 g: bare porsjoner.
    expect(foodItem(EMPTY_FOOD, SHAKE).options).toEqual([{ kind: 'portion', count: 1, label: 'shaker', grams: null }]);
  });

  it('husker mengden fra sist', () => {
    const two = { kind: 'portion' as const, count: 2, label: 'beger', grams: 160 };
    const data = { ...EMPTY_FOOD, lastAmount: { 'food:skyr': two } };
    const item = foodItem(data, SKYR);
    expect(item.amount).toEqual(two);
    expect(itemNutrients(item, item.amount)).toEqual({ protein: 352, kcal: 198 });
  });

  it('en rett logges som én porsjon av hele retten', () => {
    const dish = { id: 'd', name: 'Frokostbolle', items: [{ name: 'Havregryn', protein: 81, kcal: 222, ref: null, amount: null }] };
    const item = dishItem(EMPTY_FOOD, dish);
    expect(item.options).toEqual([{ kind: 'portion', count: 1, label: '', grams: null }]);
    expect(item.sub).toBe('Rett · 1 porsjon · 8,1 g');
  });

  it('en matvare fra tabellen: porsjonene i tabellen, så 100 g', () => {
    const egg = tableItem(EMPTY_FOOD, tableFood('02.026')!);
    expect(egg.options).toEqual([
      { kind: 'portion', count: 1, label: 'stk', grams: 56 },
      { kind: 'grams', grams: 100 },
    ]);
    expect(egg.sub).toBe('13 g protein per 100 g');
    expect(itemNutrients(egg, egg.options[0])?.protein).toBe(72);
  });

  it('finner matvaren, retten eller tabellraden en føring kom fra', () => {
    const data = F.addFood(EMPTY_FOOD, SKYR, 'skyr');
    expect(itemForRef(data, { kind: 'food', id: 'skyr' })?.name).toBe('Skyr');
    expect(itemForRef(data, { kind: 'food', id: 'borte' })).toBeNull();
    expect(itemForRef(data, { kind: 'dish', id: 'borte' })).toBeNull();
    expect(itemForRef(data, { kind: 'mvt', id: '02.026' })?.name).toBe('Egg, kokt');
    expect(itemForRef(data, { kind: 'mvt', id: 'finnes-ikke' })).toBeNull();
  });
});

import { describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import {
  amountText,
  dishSource,
  dishTotals,
  EMPTY_FOOD,
  entryTime,
  foodRows,
  foodSource,
  fractionOn,
  goalOn,
  mealGroups,
  mealName,
  nutrientsFor,
  planFoodReminders,
  previousMeal,
  proteinText,
  suggestions,
  suggestMeal,
  type Source,
} from '../food';
import * as F from '../foodState';
import { DEFAULT_SETTINGS, type Food, type FoodData } from '../types';

const ON = { modules: { ...DEFAULT_SETTINGS.modules, food: true } };
const OFF = { modules: { ...DEFAULT_SETTINGS.modules, food: false } };

const SHAKE: Food = {
  id: 'shake',
  name: 'Proteinshake',
  portion: { label: 'shaker', grams: 330, protein: 400, kcal: 210 },
  per100: null,
  mvtId: null,
};

const SKYR: Food = {
  id: 'skyr',
  name: 'Skyr',
  portion: { label: 'beger', grams: 160, protein: 170, kcal: 99 },
  per100: { protein: 110, kcal: 62 },
  mvtId: null,
};

function entry(id: string, mealId: string, protein: number, extra: Partial<F.EntryInput> = {}): F.EntryInput & { id: string } {
  return { id, time: '08:00', mealId, name: id, protein, kcal: null, ref: null, amount: null, ...extra };
}

function withEntries(day: string, list: (F.EntryInput & { id: string })[], base: FoodData = EMPTY_FOOD): FoodData {
  return list.reduce((d, e) => F.addEntry(d, day, e, e.id), base);
}

describe('mat: mål og summer', () => {
  it('målet gjelder fra dagen det ble satt, og eldre dager beholder sitt', () => {
    let d = F.setGoal(EMPTY_FOOD, 120, '2026-11-01');
    d = F.setGoal(d, 140, '2026-11-10');
    expect(goalOn(d, '2026-10-20')).toBe(120); // før første mål: det første
    expect(goalOn(d, '2026-11-05')).toBe(120);
    expect(goalOn(d, '2026-11-10')).toBe(140);
    expect(goalOn(d, '2026-11-13')).toBe(140);
    expect(goalOn(EMPTY_FOOD, '2026-11-13')).toBeNull();
  });

  it('samme dag to ganger gir én linje, og samme mål som før gir ingen ny', () => {
    let d = F.setGoal(EMPTY_FOOD, 120, '2026-11-01');
    d = F.setGoal(d, 130, '2026-11-10');
    d = F.setGoal(d, 140, '2026-11-10');
    expect(d.goals).toEqual([
      { from: '2026-11-01', grams: 120 },
      { from: '2026-11-10', grams: 140 },
    ]);
    expect(F.setGoal(d, 140, '2026-11-12').goals).toHaveLength(2);
    expect(F.setGoal(EMPTY_FOOD, 9999, '2026-11-01').goals[0].grams).toBe(500);
  });

  it('andelen av målet går til 1, og tallet kan gå over', () => {
    let d = F.setGoal(EMPTY_FOOD, 100, '2026-11-01');
    d = withEntries('2026-11-13', [entry('a', 'frokost', 600), entry('b', 'lunsj', 700)], d);
    expect(fractionOn(d, '2026-11-13')).toBe(1);
    expect(fractionOn(d, '2026-11-12')).toBe(0);
    expect(fractionOn(EMPTY_FOOD, '2026-11-12')).toBeNull();
  });

  it('grupperer dagen per måltid i måltidenes rekkefølge', () => {
    const d = withEntries('2026-11-13', [entry('b', 'lunsj', 350, { time: '12:15' }), entry('a', 'frokost', 170, { time: '07:40' }), entry('c', 'borte', 10)]);
    const groups = mealGroups(d, '2026-11-13');
    expect(groups.map((g) => g.meal.id)).toEqual(['frokost', 'lunsj', 'middag', 'kveldsmat', 'mellom', 'borte']);
    expect(groups[1].totals.protein).toBe(350);
    expect(groups[5].meal.name).toBe('Annet');
  });
});

describe('mat: måltider', () => {
  it('foreslår måltid ut fra klokka, og mellommåltid ellers', () => {
    const meals = EMPTY_FOOD.meals;
    expect(suggestMeal(meals, '07:30')?.id).toBe('frokost');
    expect(suggestMeal(meals, '12:59')?.id).toBe('lunsj');
    expect(suggestMeal(meals, '13:00')?.id).toBe('mellom');
    expect(suggestMeal(meals, '17:00')?.id).toBe('middag');
  });

  it('uten mellommåltid: det siste måltidet som har startet', () => {
    const meals = EMPTY_FOOD.meals.map((m) => (m.id === 'mellom' ? { ...m, hidden: true } : m));
    expect(suggestMeal(meals, '14:00')?.id).toBe('lunsj');
    expect(suggestMeal(meals, '04:00')?.id).toBe('frokost');
  });

  it('standardmåltidene vises på telefonens språk til de får nytt navn', () => {
    setLang('en');
    expect(mealName({ id: 'lunsj', name: 'Lunsj' })).toBe('Lunch');
    expect(mealName({ id: 'lunsj', name: 'Matpakke' })).toBe('Matpakke');
    setLang('nb');
    expect(mealName({ id: 'lunsj', name: 'Lunsj' })).toBe('Lunsj');
  });

  it('nye føringer får klokka nå i dag, og måltidets start ellers', () => {
    const now = new Date(2026, 10, 13, 9, 5);
    expect(entryTime('2026-11-13', EMPTY_FOOD.meals[0], now)).toBe('09:05');
    expect(entryTime('2026-11-12', EMPTY_FOOD.meals[1], now)).toBe('11:00');
    expect(entryTime('2026-11-12', EMPTY_FOOD.meals[4], now)).toBe('12:00');
  });

  it('et eget måltid med føringer skjules i stedet for å slettes', () => {
    let d = F.addMeal(EMPTY_FOOD, { name: ' Før trening ', start: '17:00', end: '18:00', remind: false }, 'm1');
    expect(d.meals.at(-1)).toMatchObject({ id: 'm1', name: 'Før trening', hidden: false });
    expect(F.deleteMeal(d, 'm1').meals.some((m) => m.id === 'm1')).toBe(false);
    d = F.addEntry(d, '2026-11-13', entry('a', 'm1', 100), 'a');
    expect(F.deleteMeal(d, 'm1').meals.find((m) => m.id === 'm1')?.hidden).toBe(true);
    expect(F.deleteMeal(d, 'lunsj').meals.find((m) => m.id === 'lunsj')?.hidden).toBe(true);
  });

  it('flytter måltider', () => {
    const d = F.moveMeal(EMPTY_FOOD, 'lunsj', -1);
    expect(d.meals.slice(0, 2).map((m) => m.id)).toEqual(['lunsj', 'frokost']);
    expect(F.moveMeal(EMPTY_FOOD, 'frokost', -1)).toBe(EMPTY_FOOD);
  });
});

describe('mat: mengder', () => {
  const table: Source = { per100: { protein: 312, kcal: 165 }, portion: null };

  it('regner gram og porsjoner fra tabellen', () => {
    expect(nutrientsFor(table, { kind: 'grams', grams: 150 })).toEqual({ protein: 468, kcal: 248 });
    expect(nutrientsFor(table, { kind: 'portion', count: 2, label: 'filet', grams: 120 })).toEqual({ protein: 749, kcal: 396 });
    expect(nutrientsFor(table, { kind: 'grams', grams: 0 })).toBeNull();
  });

  it('en egen porsjon bruker tallene man skrev inn', () => {
    expect(nutrientsFor(foodSource(SKYR), { kind: 'portion', count: 1, label: 'beger', grams: 160 })).toEqual({ protein: 170, kcal: 99 });
    expect(nutrientsFor(foodSource(SKYR), { kind: 'portion', count: 0.5, label: 'beger', grams: 160 })).toEqual({ protein: 85, kcal: 50 });
    // Gram går via tallene per 100 g.
    expect(nutrientsFor(foodSource(SKYR), { kind: 'grams', grams: 200 })).toEqual({ protein: 220, kcal: 124 });
    // Uten tall per 100 g: porsjonens vekt.
    expect(nutrientsFor(foodSource(SHAKE), { kind: 'grams', grams: 165 })).toEqual({ protein: 200, kcal: 105 });
  });

  it('en rett er summen av innholdet', () => {
    const dish = {
      id: 'd',
      name: 'Frokostbolle',
      items: [
        { name: 'Havregryn', protein: 80, kcal: 220, ref: null, amount: null },
        { name: 'Proteinpulver', protein: 240, kcal: null, ref: null, amount: null },
      ],
    };
    expect(dishTotals(dish)).toEqual({ protein: 320, kcal: 220 });
    expect(nutrientsFor(dishSource(dish), { kind: 'portion', count: 2, label: '', grams: null })).toEqual({ protein: 640, kcal: 440 });
  });

  it('viser mengder og protein', () => {
    expect(amountText({ kind: 'grams', grams: 150 })).toBe('150 g');
    expect(amountText({ kind: 'portion', count: 1.5, label: 'beger', grams: 160 })).toBe('1½ beger');
    expect(amountText({ kind: 'portion', count: 2, label: '', grams: null })).toBe('2 porsjoner');
    expect(amountText({ kind: 'portion', count: 0.5, label: '', grams: null })).toBe('½ porsjon');
    expect(proteinText(924)).toBe('92 g');
    expect(proteinText(13, true)).toBe('1,3 g');
    expect(proteinText(1520)).toBe('152 g');
  });
});

describe('mat: føringer', () => {
  it('husker mengden per matvare', () => {
    const amount = { kind: 'portion' as const, count: 1, label: 'beger', grams: 160 };
    const d = F.addEntry(EMPTY_FOOD, '2026-11-13', { ...entry('a', 'frokost', 170), ref: { kind: 'food', id: 'skyr' }, amount }, 'a');
    expect(d.lastAmount['food:skyr']).toEqual(amount);
  });

  it('sorterer etter klokkeslett, endrer og sletter', () => {
    let d = withEntries('2026-11-13', [entry('b', 'lunsj', 350, { time: '12:00' }), entry('a', 'frokost', 170, { time: '07:00' })]);
    expect(d.entries['2026-11-13'].map((e) => e.id)).toEqual(['a', 'b']);
    d = F.updateEntry(d, '2026-11-13', 'a', { time: '13:00', protein: 200 });
    expect(d.entries['2026-11-13'].map((e) => e.id)).toEqual(['b', 'a']);
    d = F.removeEntry(d, '2026-11-13', 'a');
    d = F.removeEntry(d, '2026-11-13', 'b');
    expect(d.entries).toEqual({});
  });

  it('«Som i går» kopierer måltidet med nye ID-er', () => {
    const d = withEntries('2026-11-12', [entry('a', 'frokost', 170), entry('b', 'frokost', 10), entry('c', 'lunsj', 350)]);
    expect(previousMeal(d, '2026-11-13', 'frokost').map((e) => e.id)).toEqual(['a', 'b']);
    const copied = F.copyMeal(d, '2026-11-13', 'frokost', '07:30', ['x', 'y']);
    expect(copied.entries['2026-11-13'].map((e) => [e.id, e.time, e.protein])).toEqual([
      ['x', '07:30', 170],
      ['y', '07:30', 10],
    ]);
    expect(F.copyMeal(d, '2026-11-13', 'middag', '17:00', [])).toBe(d);
  });

  it('en endret matvare endrer ikke det som er logget', () => {
    let d = F.addFood(EMPTY_FOOD, SHAKE, 'shake');
    d = F.addEntry(d, '2026-11-13', { ...entry('a', 'mellom', 400), ref: { kind: 'food', id: 'shake' } }, 'a');
    d = F.updateFood(d, 'shake', { ...SHAKE, portion: { ...SHAKE.portion, protein: 380 } });
    expect(d.foods[0].portion.protein).toBe(380);
    expect(d.entries['2026-11-13'][0].protein).toBe(400);
    d = F.removeFood(d, 'shake');
    expect(d.entries['2026-11-13']).toHaveLength(1);
  });
});

describe('mat: forslag', () => {
  it('mest brukt i måltidet først, så mest brukt ellers, så sist brukt', () => {
    let d = F.addFood(F.addFood(EMPTY_FOOD, SKYR, 'skyr'), SHAKE, 'shake');
    const skyr = { ref: { kind: 'food' as const, id: 'skyr' }, name: 'Skyr' };
    const shake = { ref: { kind: 'food' as const, id: 'shake' }, name: 'Proteinshake' };
    d = withEntries('2026-11-10', [entry('1', 'frokost', 170, skyr), entry('2', 'mellom', 400, shake)], d);
    d = withEntries('2026-11-11', [entry('3', 'frokost', 170, skyr), entry('4', 'mellom', 400, shake)], d);
    d = withEntries('2026-11-12', [entry('5', 'mellom', 400, shake), entry('6', 'frokost', 50, { name: 'Kantina' })], d);
    expect(suggestions(d, 'frokost', '2026-11-13').map((s) => s.name)).toEqual(['Skyr', 'Kantina', 'Proteinshake']);
    expect(suggestions(d, 'mellom', '2026-11-13').map((s) => s.name)).toEqual(['Proteinshake', 'Skyr', 'Kantina']);
  });

  it('slettede matvarer og raske tall uten navn er ikke med, og eldre enn 30 dager teller ikke', () => {
    let d = F.addFood(EMPTY_FOOD, SKYR, 'skyr');
    d = withEntries('2026-11-12', [entry('1', 'frokost', 170, { ref: { kind: 'food', id: 'borte' } }), entry('2', 'frokost', 50, { name: '' })], d);
    d = withEntries('2026-10-01', [entry('3', 'frokost', 170, { ref: { kind: 'food', id: 'skyr' } })], d);
    expect(suggestions(d, 'frokost', '2026-11-13')).toEqual([]);
  });
});

describe('mat: varsler', () => {
  const now = new Date(2026, 10, 13, 12, 30);
  const base = { ...F.setGoal(EMPTY_FOOD, 140, '2026-11-01'), eveningEnabled: true };

  it('kveldssjekken kommer bare under målet, med dagens tall', () => {
    const d = withEntries('2026-11-13', [entry('a', 'frokost', 920)], base);
    const plan = planFoodReminders(d, ON, now);
    expect(plan.map((p) => p.id)).toEqual(['food:evening:2026-11-13', 'food:evening:2026-11-14', 'food:evening:2026-11-15']);
    expect(plan[0].body).toBe('92 av 140 g så langt.');
    expect(plan[1].body).toBe('Ingenting logget ennå. Målet er 140 g.');
    const full = withEntries('2026-11-13', [entry('a', 'frokost', 1400)], base);
    expect(planFoodReminders(full, ON, now)[0].id).toBe('food:evening:2026-11-14');
  });

  it('måltidsvarselet kommer når tidsrommet er over, og ikke når noe er logget', () => {
    let d = { ...base, eveningEnabled: false };
    d = F.updateMeal(d, 'lunsj', { remind: true });
    d = F.updateMeal(d, 'middag', { remind: true });
    d = withEntries('2026-11-13', [entry('a', 'lunsj', 300)], d);
    const plan = planFoodReminders(d, ON, now);
    expect(plan.map((p) => p.id)).toEqual([
      'food:meal:middag:2026-11-13',
      'food:meal:lunsj:2026-11-14',
      'food:meal:middag:2026-11-14',
      'food:meal:lunsj:2026-11-15',
      'food:meal:middag:2026-11-15',
    ]);
    expect(plan[0].title).toBe('Har du logget middag?');
    expect(plan[0].date).toEqual(new Date(2026, 10, 13, 19, 0));
  });

  it('ingen varsler uten modulen, uten mål eller når de er av', () => {
    expect(planFoodReminders(base, OFF, now)).toEqual([]);
    expect(planFoodReminders({ ...base, goals: [] }, ON, now)).toEqual([]);
    expect(planFoodReminders({ ...base, eveningEnabled: false }, ON, now)).toEqual([]);
  });
});

describe('mat: lasting og CSV', () => {
  it('data fra før får standardverdier', () => {
    const d = F.loadFood({ goals: [{ from: '2026-11-01', grams: 120 }] });
    expect(d.meals.map((m) => m.id)).toEqual(['frokost', 'lunsj', 'middag', 'kveldsmat', 'mellom']);
    expect(d.showKcal).toBe(true);
    expect(d.entries).toEqual({});
    expect(d.eveningTime).toBe('20:00');
    expect(F.loadFood(undefined)).toEqual(EMPTY_FOOD);
  });

  it('CSV har én rad per føring, eldste først', () => {
    const d = withEntries('2026-11-13', [entry('a', 'frokost', 175, { name: 'Skyr', kcal: 99, amount: { kind: 'portion', count: 1, label: 'beger', grams: 160 } })]);
    const d2 = withEntries('2026-11-12', [entry('b', 'lunsj', 300, { name: '' })], d);
    expect(foodRows(d2)).toEqual([
      ['2026-11-12', '08:00', 'Lunsj', '', '', '30.0', ''],
      ['2026-11-13', '08:00', 'Frokost', 'Skyr', '1 beger', '17.5', '99'],
    ]);
  });
});

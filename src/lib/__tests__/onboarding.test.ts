import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang, stringsFor, tr } from '@/i18n';

import { EMPTY_MONEY } from '../money';
import { addPurchase } from '../moneyState';
import {
  addOwnHabit,
  firstHabitInputs,
  HABIT_SUGGESTIONS,
  MAX_FIRST_HABITS,
  needsOnboarding,
  onboardingStart,
  toggleFirstHabit,
  type FirstHabit,
} from '../onboarding';
import { addHabit, loadData } from '../state';
import { DEFAULT_SETTINGS, EMPTY_DATA } from '../types';

afterEach(() => setLang('nb'));

const S = stringsFor('nb').onboarding.suggestions;

const habit = { name: 'Gå en tur', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: null } as const;

describe('når oppstarten vises', () => {
  it('vises for en ny installasjon', () => {
    const data = loadData(undefined);
    expect(data.settings.onboarded).toBe(false);
    expect(needsOnboarding(data, EMPTY_MONEY)).toBe(true);
  });

  it('vises ikke for data fra før oppstarten fantes, selv uten vaner', () => {
    const old = { habits: [], logs: {}, goals: {}, goalsSkipped: {}, settings: { morningEnabled: true, morningTime: '07:00', remindersEnabled: true } };
    const data = loadData(old);
    expect(data.settings.onboarded).toBe(true);
    expect(needsOnboarding(data, EMPTY_MONEY)).toBe(false);
  });

  it('beholder valget som er lagret', () => {
    expect(loadData({ ...EMPTY_DATA, settings: { ...DEFAULT_SETTINGS, onboarded: false } }).settings.onboarded).toBe(false);
    expect(loadData({ ...EMPTY_DATA, settings: { ...DEFAULT_SETTINGS, onboarded: true } }).settings.onboarded).toBe(true);
  });

  it('vises ikke når det finnes kjøp', () => {
    const money = addPurchase(EMPTY_MONEY, { amount: 14900, merchant: 'Rema', day: '2026-11-04', time: '12:00', parts: [], skipped: false, note: '' });
    expect(needsOnboarding(loadData(undefined), money)).toBe(false);
  });

  it('fortsetter med varslene når appen ble lukket etter at vanene var lagt til', () => {
    const fresh = loadData(undefined);
    expect(onboardingStart(fresh)).toBe('welcome');
    const withHabit = addHabit(fresh, habit, '2026-11-04');
    expect(needsOnboarding(withHabit, EMPTY_MONEY)).toBe(true);
    expect(onboardingStart(withHabit)).toBe('notifications');
  });

  it('vises ikke etter at den er ferdig eller hoppet over', () => {
    const data = loadData(undefined);
    expect(needsOnboarding({ ...data, settings: { ...data.settings, onboarded: true } }, EMPTY_MONEY)).toBe(false);
  });
});

describe('de første vanene', () => {
  it('lar deg velge opptil tre', () => {
    let chosen: FirstHabit[] = [];
    for (const key of ['walk', 'water', 'read', 'exercise'] as const) chosen = toggleFirstHabit(chosen, { key });
    expect(chosen).toEqual([{ key: 'walk' }, { key: 'water' }, { key: 'read' }]);
    expect(MAX_FIRST_HABITS).toBe(3);
  });

  it('fjerner et valg, så et nytt kan velges', () => {
    let chosen = toggleFirstHabit(toggleFirstHabit([], { key: 'walk' }), { key: 'water' });
    chosen = toggleFirstHabit(chosen, { key: 'walk' });
    expect(chosen).toEqual([{ key: 'water' }]);
  });

  it('tar egne vaner med i de tre, uten tomme eller like navn', () => {
    let chosen = addOwnHabit([], '  Ringe mamma ', S);
    chosen = addOwnHabit(chosen, 'ringe mamma', S);
    chosen = addOwnHabit(chosen, '   ', S);
    expect(chosen).toEqual([{ name: 'Ringe mamma' }]);
    chosen = addOwnHabit(addOwnHabit(chosen, 'Lese bok', S), 'Skrive', S);
    expect(addOwnHabit(chosen, 'En til', S)).toBe(chosen);
    expect(toggleFirstHabit(chosen, { key: 'walk' })).toBe(chosen);
    expect(toggleFirstHabit(chosen, { name: 'RINGE MAMMA' })).toEqual([{ name: 'Lese bok' }, { name: 'Skrive' }]);
  });

  it('velger forslaget når en egen vane heter det samme', () => {
    const chosen = addOwnHabit(toggleFirstHabit([], { key: 'read' }), 'lese', S);
    expect(chosen).toEqual([{ key: 'read' }]);
    expect(addOwnHabit([], ' Gå en tur ', S)).toEqual([{ key: 'walk' }]);
  });

  it('lager vanene i den rekkefølgen de ble valgt, med navn på telefonens språk', () => {
    const chosen: FirstHabit[] = [{ key: 'water' }, { name: 'Ringe mamma' }, { key: 'exercise' }];
    expect(firstHabitInputs(chosen, tr.onboarding)).toEqual([
      { name: 'Drikke vann', color: 'himmel', type: 'count', target: 8, unit: 'glass', schedule: { kind: 'daily' }, reminder: null },
      { name: 'Ringe mamma', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: null },
      { name: 'Trene', color: 'fersken', type: 'check', target: 1, unit: '', schedule: { kind: 'weekly', times: 3 }, reminder: null },
    ]);
    setLang('en');
    expect(firstHabitInputs([{ key: 'water' }], tr.onboarding)[0]).toMatchObject({ name: 'Drink water', unit: 'glasses' });
  });

  it('gir egne vaner farger som ikke er tatt av forslagene', () => {
    const inputs = firstHabitInputs([{ key: 'walk' }, { name: 'A' }, { name: 'B' }], tr.onboarding);
    expect(inputs.map((i) => i.color)).toEqual(['salvie', 'himmel', 'lavendel']);
  });

  it('har navn på begge språk for alle forslagene', () => {
    for (const lang of ['nb', 'en'] as const) {
      for (const s of HABIT_SUGGESTIONS) {
        const o = stringsFor(lang).onboarding;
        expect(o.suggestions[s.key].length).toBeGreaterThan(0);
        expect(!!(o.suggestionUnits as Record<string, string>)[s.key]).toBe(s.input.type === 'count');
      }
    }
  });
});

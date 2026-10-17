import { describe, expect, it } from '@jest/globals';

import {
  dailyHabitsOn,
  dayStats,
  frequencyText,
  isEditable,
  isScheduled,
  periodSummary,
  restingHabitsOn,
  summaryText,
  weekCount,
  weeklyHabitsOn,
} from '../habits';
import { addGoal, addHabit, completeHabit, deleteHabit, incrementHabit, setValue, toggleGoal, toggleHabit } from '../state';
import { EMPTY_DATA, type Data, type HabitInput } from '../types';

const TODAY = '2026-10-17'; // lørdag
const START = '2026-09-01';

const walk: HabitInput = {
  name: 'Gå en tur',
  color: 'salvie',
  type: 'check',
  target: 1,
  unit: '',
  schedule: { kind: 'daily' },
  reminder: null,
};
const water: HabitInput = { ...walk, name: 'Drikke vann', color: 'himmel', type: 'count', target: 8, unit: 'glass' };
const gym: HabitInput = { ...walk, name: 'Trene', color: 'rose', schedule: { kind: 'weekly', times: 3 } };
const read: HabitInput = {
  ...walk,
  name: 'Lese',
  color: 'fersken',
  // mandag, onsdag, fredag
  schedule: { kind: 'days', days: [true, false, true, false, true, false, false] },
};

function setup(): Data {
  let d: Data = EMPTY_DATA;
  d = addHabit(d, walk, START, 'walk');
  d = addHabit(d, water, START, 'water');
  d = addHabit(d, gym, START, 'gym');
  d = addHabit(d, read, START, 'read');
  return d;
}

describe('planlegging', () => {
  it('vet hvilke vaner som gjelder hvilke dager', () => {
    const d = setup();
    expect(dailyHabitsOn(d.habits, TODAY).map((h) => h.id)).toEqual(['walk', 'water']);
    expect(restingHabitsOn(d.habits, TODAY).map((h) => h.id)).toEqual(['read']);
    expect(weeklyHabitsOn(d.habits, TODAY).map((h) => h.id)).toEqual(['gym']);
    expect(dailyHabitsOn(d.habits, '2026-10-16').map((h) => h.id)).toEqual(['walk', 'water', 'read']);
  });

  it('gjelder ikke før vanen ble laget', () => {
    let d = setup();
    d = addHabit(d, { ...walk, name: 'Ny' }, TODAY, 'new');
    const h = d.habits.find((x) => x.id === 'new')!;
    expect(isScheduled(h, '2026-10-16')).toBe(false);
    expect(isScheduled(h, TODAY)).toBe(true);
  });

  it('beskriver hvor ofte', () => {
    const d = setup();
    expect(d.habits.map(frequencyText)).toEqual(['Hver dag', 'Hver dag', '3 ganger i uka', 'Man, Ons, Fre']);
  });
});

describe('avhuking', () => {
  it('veksler ja/nei og rydder bort tomme dager', () => {
    let d = setup();
    d = toggleHabit(d, 'walk', TODAY);
    expect(d.logs[TODAY]).toEqual({ walk: 1 });
    d = toggleHabit(d, 'walk', TODAY);
    expect(d.logs[TODAY]).toBeUndefined();
  });

  it('holder antall mellom 0 og målet', () => {
    let d = setup();
    d = incrementHabit(d, 'water', TODAY, 1);
    d = incrementHabit(d, 'water', TODAY, 1);
    expect(d.logs[TODAY].water).toBe(2);
    d = setValue(d, 'water', TODAY, 99);
    expect(d.logs[TODAY].water).toBe(8);
    d = incrementHabit(d, 'water', TODAY, -20);
    expect(d.logs[TODAY]).toBeUndefined();
  });

  it('«Gjort» fra varsel fyller hele målet', () => {
    let d = setup();
    d = completeHabit(d, 'water', TODAY);
    expect(d.logs[TODAY].water).toBe(8);
    d = completeHabit(d, 'walk', TODAY);
    expect(d.logs[TODAY].walk).toBe(1);
  });

  it('teller ukentlige vaner mandag til søndag', () => {
    let d = setup();
    d = toggleHabit(d, 'gym', '2026-10-11'); // søndag uka før
    d = toggleHabit(d, 'gym', '2026-10-13');
    d = toggleHabit(d, 'gym', '2026-10-15');
    const h = d.habits.find((x) => x.id === 'gym')!;
    expect(weekCount(d, h, TODAY)).toBe(2);
  });

  it('sletter logg når vanen slettes', () => {
    let d = setup();
    d = toggleHabit(d, 'walk', TODAY);
    d = toggleHabit(d, 'water', TODAY);
    d = deleteHabit(d, 'walk');
    expect(d.habits.find((h) => h.id === 'walk')).toBeUndefined();
    expect(d.logs[TODAY]).toEqual({ water: 1 });
  });
});

describe('alt samlet', () => {
  it('regner snitt av daglige vaner og mål', () => {
    let d = setup();
    d = toggleHabit(d, 'walk', TODAY); // 1
    d = setValue(d, 'water', TODAY, 4); // 0.5
    d = addGoal(d, TODAY, 'Ringe bestemor', 'g1'); // 0
    d = addGoal(d, TODAY, 'Rydde boden', 'g2');
    d = toggleGoal(d, TODAY, 'g2'); // 1
    const s = dayStats(d, TODAY);
    expect(s.total).toBe(4);
    expect(s.done).toBe(2);
    expect(s.average).toBeCloseTo((1 + 0.5 + 0 + 1) / 4);
  });

  it('gir null når ingenting gjaldt', () => {
    expect(dayStats(EMPTY_DATA, TODAY).average).toBeNull();
  });
});

describe('oppsummering', () => {
  it('teller dager, ganger og mengde', () => {
    let d = setup();
    for (const day of ['2026-10-15', '2026-10-16', TODAY]) d = toggleHabit(d, 'walk', day);
    d = setValue(d, 'water', '2026-10-16', 8);
    d = setValue(d, 'water', TODAY, 3);
    d = toggleHabit(d, 'gym', '2026-10-14');
    const [w, wa, g, r] = d.habits;
    expect(summaryText(periodSummary(d, w, TODAY, 7))).toBe('3 av 7 dager');
    expect(summaryText(periodSummary(d, wa, TODAY, 7))).toBe('11 glass totalt');
    expect(summaryText(periodSummary(d, g, TODAY, 7))).toBe('1 gang');
    // lese gjelder bare man/ons/fre: 12., 14. og 16. oktober
    expect(summaryText(periodSummary(d, r, TODAY, 7))).toBe('0 av 3 dager');
  });

  it('kaller en vane laget i dag for ny', () => {
    let d = setup();
    d = addHabit(d, walk, TODAY, 'fresh');
    expect(summaryText(periodSummary(d, d.habits[d.habits.length - 1], TODAY, 7))).toBe('Ny i dag');
  });
});

describe('retting', () => {
  it('lar bare i dag og i går endres', () => {
    expect(isEditable(TODAY, TODAY)).toBe(true);
    expect(isEditable('2026-10-16', TODAY)).toBe(true);
    expect(isEditable('2026-10-15', TODAY)).toBe(false);
    expect(isEditable('2026-10-18', TODAY)).toBe(false);
  });
});

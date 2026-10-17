import { describe, expect, it } from '@jest/globals';

import { nextHabit } from '../habits';
import { addGoal, addHabit, setValue, skipGoals, toggleGoal, toggleHabit } from '../state';
import { EMPTY_DATA, type Data, type HabitInput } from '../types';
import { buildLockProps, buildTodayProps, lockEntryTimes, lockMode } from '../widgetProps';

const DAY = '2026-10-17';
const at = (h: number, m = 0) => new Date(2026, 9, 17, h, m);

const base: HabitInput = {
  name: 'Gå en tur',
  color: 'salvie',
  type: 'check',
  target: 1,
  unit: '',
  schedule: { kind: 'daily' },
  reminder: null,
};

function setup(): Data {
  let d: Data = EMPTY_DATA;
  d = addHabit(d, base, '2026-10-01', 'walk');
  d = addHabit(d, { ...base, name: 'Lese', reminder: '21:00' }, '2026-10-01', 'read');
  d = addHabit(d, { ...base, name: 'Strekke ut', reminder: '07:30' }, '2026-10-01', 'stretch');
  return d;
}

describe('neste vane', () => {
  it('tar vaner med påminnelse først, etter klokkeslett', () => {
    const d = setup();
    expect(nextHabit(d, DAY)?.id).toBe('stretch');
    expect(nextHabit(toggleHabit(d, 'stretch', DAY), DAY)?.id).toBe('read');
    const allButWalk = toggleHabit(toggleHabit(d, 'stretch', DAY), 'read', DAY);
    expect(nextHabit(allButWalk, DAY)?.id).toBe('walk');
    expect(nextHabit(toggleHabit(allButWalk, 'walk', DAY), DAY)).toBeNull();
  });
});

describe('låseskjermen', () => {
  it('inviterer til mål om morgenen når ingen mål er satt', () => {
    const p = buildLockProps(setup(), DAY, at(8));
    expect(p.mode).toBe('prompt');
    expect(p.line).toBe('Hva vil du få til i dag?');
    expect(p.url).toBe('vane://goals');
  });

  it('viser neste vane etter kl. 12 når ingen mål er satt', () => {
    const p = buildLockProps(setup(), DAY, at(12));
    expect(p.mode).toBe('habits');
    expect(p.title).toBe('NESTE');
    expect(p.line).toBe('Strekke ut · 07:30');
    expect(p.detail).toBe('0 av 3 vaner');
    expect(p.url).toBe('vane://');
  });

  it('slutter å spørre når man har sagt «Ikke i dag»', () => {
    const d = skipGoals(setup(), DAY);
    expect(lockMode(d, DAY, at(8))).toBe('habits');
    expect(buildTodayProps(d, DAY).goalPrompt).toBe(false);
  });

  it('viser første uferdige mål når mål finnes', () => {
    let d = setup();
    d = addGoal(d, DAY, 'Ringe bestemor', 'g1');
    d = addGoal(d, DAY, 'Rydde boden', 'g2');
    d = addGoal(d, DAY, 'Svare Kari', 'g3');
    d = toggleGoal(d, DAY, 'g1');
    const p = buildLockProps(d, DAY, at(8));
    expect(p.mode).toBe('goals');
    expect(p.line).toBe('Rydde boden + 1 til');
    expect(p.inline).toBe('0/3 vaner · 1/3 mål');
    d = toggleGoal(toggleGoal(d, DAY, 'g2'), DAY, 'g3');
    expect(buildLockProps(d, DAY, at(15)).line).toBe('3 av 3 mål gjort');
  });

  it('sier rett ut når alt er gjort, uten feiring', () => {
    let d = setup();
    for (const id of ['walk', 'read', 'stretch']) d = toggleHabit(d, id, DAY);
    const p = buildLockProps(d, DAY, at(18));
    expect(p.title).toBe('I DAG');
    expect(p.line).toBe('Alt er gjort i dag');
  });

  it('bytter innhold kl. 12 og ved midnatt', () => {
    expect(lockEntryTimes(at(8)).map((d) => d.toString())).toEqual(
      [at(8), at(12), new Date(2026, 9, 18), new Date(2026, 9, 18, 12)].map((d) => d.toString())
    );
    expect(lockEntryTimes(at(15))).toHaveLength(3);
  });
});

describe('hjemskjermen', () => {
  it('har mål-lenke bare når mål mangler, og en mållinje når de finnes', () => {
    let d = setup();
    expect(buildTodayProps(d, DAY)).toMatchObject({ goalPrompt: true, goalLine: '' });
    d = addGoal(d, DAY, 'Ringe bestemor', 'g1');
    expect(buildTodayProps(d, DAY)).toMatchObject({ goalPrompt: false, goalLine: 'Mål: Ringe bestemor · 0 av 1' });
  });

  it('sender med verdier og farger for hver vane', () => {
    const d = setValue(addHabit(setup(), { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass' }, '2026-10-01', 'water'), 'water', DAY, 5);
    const water = buildTodayProps(d, DAY).items.find((i) => i.id === 'water');
    expect(water).toMatchObject({ kind: 'count', target: 8, value: 5 });
    expect(water?.light.solid).toMatch(/^#/);
  });
});

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
    expect(p).toMatchObject({ mode: 'prompt', main: 'Sett dagens mål', sub: '3 vaner i dag', url: 'vane://goals' });
  });

  it('viser det som er igjen etter kl. 12 når ingen mål er satt', () => {
    const p = buildLockProps(setup(), DAY, at(12));
    expect(p).toMatchObject({ mode: 'habits', main: '3 igjen', sub: 'Strekke ut, Lese, Gå en tur', done: 0, total: 3, url: 'vane://' });
  });

  it('slutter å spørre når man har sagt «Ikke i dag»', () => {
    const d = skipGoals(setup(), DAY);
    expect(lockMode(d, DAY, at(8))).toBe('habits');
    expect(buildTodayProps(d, DAY, at(8)).goalPrompt).toBe(false);
  });

  it('viser første uferdige mål når mål finnes', () => {
    let d = setup();
    d = addGoal(d, DAY, 'Ringe bestemor', 'g1');
    d = addGoal(d, DAY, 'Rydde boden', 'g2');
    d = toggleGoal(d, DAY, 'g1');
    const p = buildLockProps(toggleHabit(d, 'walk', DAY), DAY, at(8));
    expect(p).toMatchObject({ mode: 'goals', main: 'Rydde boden', sub: '1 av 2 mål', done: 1, total: 3 });
    expect(p.inline).toBe('Rydde boden · 1/3');
  });

  it('går over til vanene når målene er gjort', () => {
    let d = setup();
    d = toggleGoal(addGoal(d, DAY, 'Ringe bestemor', 'g1'), DAY, 'g1');
    d = toggleHabit(toggleHabit(d, 'walk', DAY), 'stretch', DAY);
    expect(buildLockProps(d, DAY, at(21))).toMatchObject({ main: 'Lese', sub: 'kl. 21:00', inline: 'Igjen: Lese' });
  });

  it('sier rett ut når alt er gjort, uten feiring', () => {
    let d = setup();
    for (const id of ['walk', 'read', 'stretch']) d = toggleHabit(d, id, DAY);
    expect(buildLockProps(d, DAY, at(18))).toMatchObject({ main: 'Alt er gjort', sub: '3 vaner', done: 3, total: 3 });
  });

  it('viser mengden for en tellevane som er den siste', () => {
    let d = setup();
    for (const id of ['walk', 'read', 'stretch']) d = toggleHabit(d, id, DAY);
    d = addHabit(d, { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass' }, '2026-10-01', 'water');
    expect(buildLockProps(setValue(d, 'water', DAY, 5), DAY, at(18))).toMatchObject({ main: 'Vann', sub: '5 av 8 glass' });
  });

  it('bytter innhold kl. 12 og ved midnatt', () => {
    expect(lockEntryTimes(at(8)).map((d) => d.toString())).toEqual(
      [at(8), at(12), new Date(2026, 9, 18), new Date(2026, 9, 18, 12)].map((d) => d.toString())
    );
    expect(lockEntryTimes(at(15))).toHaveLength(3);
  });
});

describe('hjemskjermen', () => {
  it('spør etter mål om morgenen, og sender målene når de finnes', () => {
    let d = setup();
    expect(buildTodayProps(d, DAY, at(8))).toMatchObject({ goalPrompt: true, goals: [] });
    expect(buildTodayProps(d, DAY, at(13)).goalPrompt).toBe(false);
    d = addGoal(d, DAY, 'Ringe bestemor', 'g1');
    expect(buildTodayProps(d, DAY, at(8))).toMatchObject({
      goalPrompt: false,
      goals: [{ id: 'g1', text: 'Ringe bestemor', done: false }],
    });
  });

  it('spør om morgenen i oppslaget for i morgen, selv om det lages om kvelden', () => {
    const tomorrow = '2026-10-18';
    expect(buildTodayProps(setup(), tomorrow, new Date(2026, 9, 18)).goalPrompt).toBe(true);
  });

  it('sender med verdier, påminnelse og farger for hver vane', () => {
    const d = setValue(addHabit(setup(), { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass' }, '2026-10-01', 'water'), 'water', DAY, 5);
    const props = buildTodayProps(d, DAY, at(8));
    expect(props.items.find((i) => i.id === 'water')).toMatchObject({ kind: 'count', target: 8, value: 5, unit: 'glass', weekly: false });
    expect(props.items.find((i) => i.id === 'read')).toMatchObject({ kind: 'check', time: '21:00' });
    expect(props.items[0].light.solid).toMatch(/^#/);
  });

  it('merker ukentlige vaner', () => {
    const d = addHabit(setup(), { ...base, name: 'Svømme', schedule: { kind: 'weekly', times: 2 } }, '2026-10-01', 'swim');
    expect(buildTodayProps(d, DAY, at(8)).items.find((i) => i.id === 'swim')).toMatchObject({ weekly: true, time: null });
  });
});

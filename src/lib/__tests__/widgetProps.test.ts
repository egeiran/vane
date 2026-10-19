import { describe, expect, it } from '@jest/globals';

import { goalsOn, nextHabit, valueOn } from '../habits';
import { addGoal, addHabit, incrementHabit, setValue, skipGoals, toggleGoal, toggleHabit } from '../state';
import { EMPTY_DATA, type Data, type HabitInput } from '../types';
import { applyWidgetTaps, buildLockProps, buildTodayProps, lockEntryTimes, lockMode, pushedValues } from '../widgetProps';

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
    expect(buildTodayProps(d, DAY, at(8)).items.find((i) => i.id === 'swim')).toMatchObject({ weekly: true, time: '' });
  });
});

describe('trykk i widgeten', () => {
  const YESTERDAY = '2026-10-16';
  const TOMORROW = '2026-10-18';

  function withWater(): Data {
    return addHabit(setup(), { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass' }, '2026-10-01', 'water');
  }

  /** Det appen sender, og widgeten etter at `tap` har endret dagens oppslag. */
  function sent(d: Data, tap: (p: ReturnType<typeof buildTodayProps>) => void) {
    const props = buildTodayProps(d, DAY, at(9));
    const pushed = pushedValues([props]);
    const widget = structuredClone(props);
    tap(widget);
    return { pushed, widget };
  }

  it('tar inn det som er huket av i widgeten', () => {
    const d = setup();
    const { pushed, widget } = sent(d, (w) => (w.items.find((i) => i.id === 'walk')!.value = 1));
    expect(valueOn(applyWidgetTaps(d, [widget], pushed, DAY), 'walk', DAY)).toBe(1);
  });

  it('lar appen vinne når widgeten ikke er rørt', () => {
    const d = setup();
    const { pushed, widget } = sent(d, () => {});
    const changedInApp = toggleHabit(d, 'walk', DAY);
    expect(applyWidgetTaps(changedInApp, [widget], pushed, DAY)).toBe(changedInApp);
  });

  it('legger endringer sammen i stedet for å overskrive', () => {
    const d = setValue(withWater(), 'water', DAY, 5);
    const { pushed, widget } = sent(d, (w) => (w.items.find((i) => i.id === 'water')!.value = 6));
    const fromNotification = incrementHabit(d, 'water', DAY, 1);
    expect(valueOn(applyWidgetTaps(fromNotification, [widget], pushed, DAY), 'water', DAY)).toBe(7);
  });

  it('kan angre en avhuking', () => {
    const d = toggleHabit(setup(), 'read', DAY);
    const { pushed, widget } = sent(d, (w) => (w.items.find((i) => i.id === 'read')!.value = 0));
    expect(valueOn(applyWidgetTaps(d, [widget], pushed, DAY), 'read', DAY)).toBe(0);
  });

  it('huker av mål, men ikke to ganger', () => {
    const d = addGoal(setup(), DAY, 'Rydde boden', 'g1');
    const { pushed, widget } = sent(d, (w) => (w.goals[0].done = true));
    const once = applyWidgetTaps(d, [widget], pushed, DAY);
    expect(goalsOn(once, DAY)[0].done).toBe(true);
    expect(goalsOn(applyWidgetTaps(toggleGoal(d, DAY, 'g1'), [widget], pushed, DAY), DAY)[0].done).toBe(true);
  });

  it('tar bare inn i dag og i går', () => {
    const d = setup();
    const tap = (day: string) => {
      const props = { ...buildTodayProps(d, day, at(9)), day };
      const pushed = pushedValues([props]);
      const widget = structuredClone(props);
      widget.items.find((i) => i.id === 'walk')!.value = 1;
      return valueOn(applyWidgetTaps(d, [widget], pushed, DAY), 'walk', day);
    };
    expect(tap(YESTERDAY)).toBe(1);
    expect(tap(TOMORROW)).toBe(0);
    expect(tap('2026-10-15')).toBe(0);
  });

  it('hopper over vaner som er slettet', () => {
    const d = setup();
    const { pushed, widget } = sent(d, (w) => w.items.push({ ...w.items[0], id: 'gone', value: 1 }));
    pushed[DAY].gone = 0;
    expect(applyWidgetTaps(d, [widget], pushed, DAY)).toEqual(d);
  });
});

/** Stier til felt som er `null` eller `undefined`. iOS kan ikke lagre dem i widget-lagringen. */
function missing(value: unknown, path = 'props'): string[] {
  if (value === null || value === undefined) return [path];
  if (typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => missing(v, `${path}.${k}`));
}

describe('det som sendes til widgetene', () => {
  it('har aldri null eller undefined, uansett tilstand', () => {
    let d = setup();
    d = addHabit(d, { ...base, name: 'Svømme', schedule: { kind: 'weekly', times: 2 } }, '2026-10-01', 'swim');
    // Eldre lagrede vaner kan mangle felt.
    d = { ...d, habits: [...d.habits, { ...d.habits[0], id: 'old', type: 'count', target: 3, unit: undefined as unknown as string }] };
    const states = [d, addGoal(d, DAY, 'Rydde boden', 'g1'), skipGoals(d, DAY), EMPTY_DATA];
    for (const s of states) {
      for (const hour of [8, 13, 21]) {
        expect(missing(buildTodayProps(s, DAY, at(hour)))).toEqual([]);
        expect(missing(buildLockProps(s, DAY, at(hour)))).toEqual([]);
      }
    }
  });
});

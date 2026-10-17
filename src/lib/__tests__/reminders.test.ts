import { describe, expect, it } from '@jest/globals';

import { CATEGORY_CHECK, CATEGORY_COUNT, MAX_REMINDERS, planReminders } from '../reminders';
import { addHabit, toggleHabit, updateSettings } from '../state';
import { EMPTY_DATA, type Data, type HabitInput } from '../types';

const base: HabitInput = {
  name: 'Lese',
  color: 'fersken',
  type: 'check',
  target: 1,
  unit: '',
  schedule: { kind: 'daily' },
  reminder: '21:00',
};

// Lørdag 17. oktober 2026 kl. 12:00
const NOW = new Date(2026, 9, 17, 12, 0);

describe('påminnelser', () => {
  it('legger inn påminnelser for sju dager med riktig kategori', () => {
    let d: Data = addHabit(EMPTY_DATA, base, '2026-10-01', 'read');
    d = addHabit(d, { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass', reminder: '10:00' }, '2026-10-01', 'water');
    const plan = planReminders(d, NOW);
    // vann kl. 10 i dag er passert: 7 for lese + 6 for vann
    expect(plan).toHaveLength(13);
    expect(plan[0]).toMatchObject({ id: 'habit:read:2026-10-17', category: CATEGORY_CHECK, title: 'Lese' });
    expect(plan.find((p) => p.data.habitId === 'water')?.category).toBe(CATEGORY_COUNT);
    expect(plan.every((p, i) => i === 0 || p.date >= plan[i - 1].date)).toBe(true);
  });

  it('hopper over vaner som allerede er gjort i dag', () => {
    let d: Data = addHabit(EMPTY_DATA, base, '2026-10-01', 'read');
    d = toggleHabit(d, 'read', '2026-10-17');
    expect(planReminders(d, NOW).map((p) => p.data.day)).not.toContain('2026-10-17');
  });

  it('følger valgte ukedager', () => {
    const d = addHabit(
      EMPTY_DATA,
      { ...base, schedule: { kind: 'days', days: [true, false, false, false, false, false, false] } },
      '2026-10-01',
      'mon'
    );
    expect(planReminders(d, NOW).map((p) => p.data.day)).toEqual(['2026-10-19']);
  });

  it('stopper når ukemålet er nådd', () => {
    let d: Data = addHabit(EMPTY_DATA, { ...base, schedule: { kind: 'weekly', times: 2 } }, '2026-10-01', 'gym');
    d = toggleHabit(d, 'gym', '2026-10-13');
    d = toggleHabit(d, 'gym', '2026-10-15');
    // Resten av denne uka (lør, søn) er hoppet over; neste uke starter mandag 19.
    expect(planReminders(d, NOW).map((p) => p.data.day)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
  });

  it('gir ingen påminnelser når de er skrudd av', () => {
    const d = updateSettings(addHabit(EMPTY_DATA, base, '2026-10-01'), { remindersEnabled: false });
    expect(planReminders(d, NOW)).toEqual([]);
  });

  it('holder seg under grensen til iOS', () => {
    let d: Data = EMPTY_DATA;
    for (let i = 0; i < 20; i++) d = addHabit(d, { ...base, name: `V${i}` }, '2026-10-01');
    expect(planReminders(d, NOW)).toHaveLength(MAX_REMINDERS);
  });
});

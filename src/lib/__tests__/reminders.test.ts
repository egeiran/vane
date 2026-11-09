import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import { CATEGORY_CHECK, CATEGORY_COUNT, DAYS_AHEAD, MAX_REMINDERS, planReminders } from '../reminders';
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
  afterEach(() => setLang('nb'));

  it('legger inn påminnelser fire uker fram med riktig kategori, når de holder seg under grensen', () => {
    let d: Data = addHabit(EMPTY_DATA, base, '2026-10-01', 'read');
    d = addHabit(d, { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass', reminder: '10:00' }, '2026-10-01', 'water');
    const plan = planReminders(d, NOW);
    // vann kl. 10 i dag er passert: 28 for lese + 27 for vann
    expect(DAYS_AHEAD).toBe(28);
    expect(plan).toHaveLength(55);
    expect(plan.at(-1)?.data.day).toBe('2026-11-13');
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
    expect(planReminders(d, NOW).map((p) => p.data.day)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  });

  it('stopper når ukemålet er nådd', () => {
    let d: Data = addHabit(EMPTY_DATA, { ...base, schedule: { kind: 'weekly', times: 2 } }, '2026-10-01', 'gym');
    d = toggleHabit(d, 'gym', '2026-10-13');
    d = toggleHabit(d, 'gym', '2026-10-15');
    // Resten av denne uka (lør, søn) er hoppet over; neste uke starter mandag 19.
    const days = planReminders(d, NOW).map((p) => p.data.day);
    expect(days.slice(0, 2)).toEqual(['2026-10-19', '2026-10-20']);
    expect(days).not.toContain('2026-10-17');
    expect(days).not.toContain('2026-10-18');
    expect(days).toHaveLength(26);
  });

  it('gir ingen påminnelser når de er skrudd av', () => {
    const d = updateSettings(addHabit(EMPTY_DATA, base, '2026-10-01'), { remindersEnabled: false });
    expect(planReminders(d, NOW)).toEqual([]);
  });

  it('holder seg under grensen til iOS, og kutter ved en hel dag', () => {
    let d: Data = EMPTY_DATA;
    for (let i = 0; i < 20; i++) d = addHabit(d, { ...base, name: `V${i}` }, '2026-10-01');
    const plan = planReminders(d, NOW);
    expect(plan.length).toBeLessThanOrEqual(MAX_REMINDERS);
    // 20 vaner: to hele dager, ikke noen av vanene på den tredje.
    expect(plan).toHaveLength(40);
    expect(new Set(plan.map((p) => p.data.day))).toEqual(new Set(['2026-10-17', '2026-10-18']));
  });

  it('gir plass til varslene for faste utgifter når grensen er mindre', () => {
    let d: Data = EMPTY_DATA;
    for (let i = 0; i < 20; i++) d = addHabit(d, { ...base, name: `V${i}` }, '2026-10-01');
    // Med fire varsler for faste utgifter er det plass til 52: to hele dager, som før.
    expect(planReminders(d, NOW, MAX_REMINDERS - 4)).toHaveLength(40);
    // Med plass til 30 ville bare i dag blitt igjen, så det fylles opp til grensen.
    expect(planReminders(d, NOW, 30)).toHaveLength(30);
  });

  it('sier fra bare langt fram for en vane med én ukedag', () => {
    const d = addHabit(EMPTY_DATA, { ...base, schedule: { kind: 'days', days: [true, false, false, false, false, false, false] } }, '2026-10-01', 'mon');
    const plan = planReminders(d, NOW);
    expect(plan.filter((p) => p.body.includes('Åpne Vane')).map((p) => p.data.day)).toEqual(['2026-11-09']);
  });

  it('sier fra i den siste påminnelsen at Vane må åpnes', () => {
    let d: Data = addHabit(EMPTY_DATA, base, '2026-10-01', 'read');
    d = addHabit(d, { ...base, name: 'Vann', type: 'count', target: 8, unit: 'glass', reminder: '10:00' }, '2026-10-01', 'water');
    const plan = planReminders(d, NOW);
    expect(plan.at(-1)).toMatchObject({ id: 'habit:read:2026-11-13', body: 'Har du fått gjort det i dag? Åpne Vane, så fortsetter påminnelsene.' });
    expect(plan.at(-2)?.body).toBe('Målet i dag er 8 glass.');
    expect(plan.filter((p) => p.body.includes('Åpne Vane'))).toHaveLength(1);
  });

  it('sier fra i den siste også når grensen er nådd, og på engelsk', () => {
    let d: Data = EMPTY_DATA;
    for (let i = 0; i < 10; i++) d = addHabit(d, { ...base, name: `V${i}`, reminder: `${12 + i}:30` }, '2026-10-01', `h${i}`);
    setLang('en');
    const plan = planReminders(d, NOW);
    expect(plan).toHaveLength(50);
    expect(plan.at(-1)?.body).toBe('Have you done it today? Open Vane to keep getting reminders.');
    expect(plan.slice(0, -1).some((p) => p.body.includes('Open Vane'))).toBe(false);
  });

  it('har ingen påminnelser å si fra i når ingen er planlagt', () => {
    expect(planReminders(EMPTY_DATA, NOW)).toEqual([]);
  });

  it('fyller opp til grensen heller enn å stoppe i dag', () => {
    let d: Data = EMPTY_DATA;
    // 29 daglige vaner: kl. 12:30 i dag + i morgen er 58, over grensen.
    for (let i = 0; i < 29; i++) d = addHabit(d, { ...base, name: `V${i}`, reminder: '12:30' }, '2026-10-01', `h${i}`);
    const plan = planReminders(d, NOW);
    expect(plan).toHaveLength(MAX_REMINDERS);
    expect(plan.some((p) => p.data.day === '2026-10-18')).toBe(true);
    // Planen rekker ikke to dager fram, så ingen påminnelse sier fra.
    expect(plan.some((p) => p.body.includes('Åpne Vane'))).toBe(false);
  });
});

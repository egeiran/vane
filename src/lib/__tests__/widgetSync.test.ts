import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { todayKey } from '../dates';
import { valueOn } from '../habits';
import { useStore } from '../store';
import { EMPTY_DATA } from '../types';
import { scheduleSyncWidgets, syncWidgets } from '../widgetSync';

type Entry = { date: Date; props: any };

const mockKv = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => mockKv.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mockKv.set(k, v),
    removeItemSync: (k: string) => void mockKv.delete(k),
  },
}));
jest.mock('expo-widgets', () => ({ addUserInteractionListener: () => ({ remove() {} }) }));

/** Widget-lagringen (App Group) slik iOS har den: den kan ikke lagre null eller undefined. */
const mockWidget = { timeline: [] as Entry[] };
function mockAssertStorable(value: unknown, path = 'props'): void {
  if (value === null || value === undefined) throw new Error(`Kan ikke lagres i widget-lagringen: ${path}`);
  if (typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) mockAssertStorable(v, `${path}.${k}`);
  }
}
jest.mock('@/widgets/TodayWidget', () => ({
  __esModule: true,
  default: {
    updateTimeline: (entries: Entry[]) => {
      mockAssertStorable(entries);
      mockWidget.timeline = structuredClone(entries);
    },
    getTimeline: async () => structuredClone(mockWidget.timeline),
  },
}));
jest.mock('@/widgets/LockWidget', () => ({ __esModule: true, default: { updateTimeline: (e: Entry[]) => mockAssertStorable(e) } }));

/** Det widgeten gjør ved et trykk: endrer verdien i oppslaget som vises. */
function tapInWidget(id: string, value: number) {
  const entry = mockWidget.timeline[0];
  entry.props.items = entry.props.items.map((i: any) => (i.id === id ? { ...i, value } : i));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('synk med widgeten', () => {
  let unsubscribe: () => void;
  const today = todayKey();

  beforeEach(() => {
    mockKv.clear();
    useStore.setState(EMPTY_DATA);
    useStore.getState().addHabit(
      { name: 'Gå en tur', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: null },
      '2026-01-01'
    );
    // Samme kobling som i appen: endringer i appen gir en synk.
    unsubscribe = useStore.subscribe((s, prev) => {
      if (s.logs !== prev.logs || s.goals !== prev.goals) scheduleSyncWidgets();
    });
  });
  afterEach(() => unsubscribe());

  it('kan angre i appen etter at noe er huket av i widgeten', async () => {
    const id = useStore.getState().habits[0].id;
    await syncWidgets();

    tapInWidget(id, 1);
    await syncWidgets(); // appen åpnes
    expect(valueOn(useStore.getState(), id, today)).toBe(1);
    await wait(150);

    useStore.getState().toggle(id, today); // angre i appen
    await wait(150);
    await syncWidgets();
    expect(valueOn(useStore.getState(), id, today)).toBe(0);
    expect(mockWidget.timeline[0].props.items[0].value).toBe(0);
  });

  it('sender endringer fra appen til widgeten', async () => {
    const id = useStore.getState().habits[0].id;
    await syncWidgets();
    useStore.getState().toggle(id, today);
    await wait(150);
    expect(mockWidget.timeline[0].props.items[0].value).toBe(1);
  });
});

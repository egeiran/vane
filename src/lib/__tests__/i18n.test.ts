import { afterEach, describe, expect, it } from '@jest/globals';

import { langFromLocales, setLang, stringsFor } from '@/i18n';

import { formatLong, formatShort, relativeDayName, relativeWeekday } from '../dates';
import { amountText, frequencyText, periodSummary, summaryText } from '../habits';
import { categoryName, DEFAULT_CATEGORIES, EMPTY_MONEY, merchantName, monthName, purchaseWhen, UNKNOWN_PLACE } from '../money';
import { addPurchase } from '../moneyState';
import type { Data, Habit } from '../types';
import { EMPTY_DATA } from '../types';
import { buildLockProps, buildPengerProps, buildTodayProps } from '../widgetProps';

afterEach(() => setLang('nb'));

// Jest kjører i Node, men Node-typene er ikke med i prosjektet (de ville gjelde hele appen).
declare const require: (id: string) => unknown;
declare const __dirname: string;
const { readFileSync } = require('fs') as { readFileSync: (path: string, encoding: 'utf8') => string };
const read = (...parts: string[]) => readFileSync([__dirname, '..', '..', '..', ...parts].join('/'), 'utf8');

describe('språket fra telefonen', () => {
  const lang = (...codes: (string | null)[]) => langFromLocales(codes.map((languageCode) => ({ languageCode })));

  it('gir norsk for bokmål, nynorsk og «no»', () => {
    expect(lang('nb')).toBe('nb');
    expect(lang('nn')).toBe('nb');
    expect(lang('no')).toBe('nb');
    expect(lang('NB')).toBe('nb');
  });

  it('gir engelsk for engelsk og for språk appen ikke har', () => {
    expect(lang('en')).toBe('en');
    expect(lang('de')).toBe('en');
    expect(lang()).toBe('en');
  });

  it('velger det første språket appen har, slik iOS gjør', () => {
    expect(lang('sv', 'nb', 'en')).toBe('nb');
    expect(lang('sv', 'en', 'nb')).toBe('en');
    expect(lang(null, 'nn')).toBe('nb');
  });
});

/** Alle stier til tekst i et språk, med typen: 'common.cancel' → 'string'. */
function shape(value: unknown, path = ''): Record<string, string> {
  if (typeof value === 'function') return { [path]: `function/${value.length}` };
  if (Array.isArray(value)) {
    return Object.assign({ [path]: `array/${value.length}` }, ...value.map((v, i) => shape(v, `${path}[${i}]`)));
  }
  if (value && typeof value === 'object') {
    return Object.assign({}, ...Object.entries(value).map(([k, v]) => shape(v, path ? `${path}.${k}` : k)));
  }
  return { [path]: typeof value };
}

describe('teksten', () => {
  const nb = stringsFor('nb');
  const en = stringsFor('en');

  it('har de samme nøklene, listene og funksjonene på begge språk', () => {
    expect(shape(en)).toEqual(shape(nb));
  });

  it('har ingen tomme tekster', () => {
    const empty = (value: unknown, path: string): string[] =>
      typeof value === 'string'
        ? value.trim()
          ? []
          : [path]
        : value && typeof value === 'object'
          ? Object.entries(value).flatMap(([k, v]) => empty(v, `${path}.${k}`))
          : [];
    expect(empty(nb, 'nb')).toEqual([]);
    expect(empty(en, 'en')).toEqual([]);
  });

  it('har de samme {plassholderne} i widget-malene på begge språk', () => {
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, template] of Object.entries(nb.widgets.today)) {
      expect([key, holes((en.widgets.today as Record<string, string>)[key])]).toEqual([key, holes(template)]);
    }
  });

  it('har sju ukedager og tolv måneder, med mandag først', () => {
    for (const s of [nb, en]) {
      expect(s.dates.weekdayLetters).toHaveLength(7);
      expect(s.dates.weekdayShort).toHaveLength(7);
      expect(s.dates.weekdayLong).toHaveLength(7);
      expect(s.dates.months).toHaveLength(12);
      expect(s.dates.monthsShort).toHaveLength(12);
    }
    expect(en.dates.weekdayLong[0]).toBe('Monday');
  });

  it('har engelsk navn på alle standardkategoriene', () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(nb.defaultCategories[c.id]).toBe(c.name);
      expect(en.defaultCategories[c.id]).toBeTruthy();
    }
  });
});

describe('datoer på begge språk', () => {
  it('norsk', () => {
    expect(formatLong('2026-10-17')).toBe('Lørdag 17. oktober');
    expect(formatShort('2026-09-21')).toBe('21. sep');
    expect(relativeWeekday('2026-10-09', '2026-10-17')).toBe('Fredag');
    expect(monthName('2025-12', '2026-10-17')).toBe('desember 2025');
  });

  it('engelsk', () => {
    setLang('en');
    expect(formatLong('2026-10-17')).toBe('Saturday, October 17');
    expect(formatShort('2026-09-21')).toBe('Sep 21');
    expect(relativeDayName('2026-10-17', '2026-10-17')).toBe('Today');
    expect(relativeDayName('2026-10-16', '2026-10-17')).toBe('Yesterday');
    expect(relativeDayName('2026-10-09', '2026-10-17')).toBe('Friday, October 9');
    expect(relativeWeekday('2026-10-09', '2026-10-17')).toBe('Friday');
    expect(relativeWeekday('2026-10-16', '2026-10-17')).toBe('Yesterday');
    expect(monthName('2026-10', '2026-10-17')).toBe('October');
    expect(monthName('2025-12', '2026-10-17')).toBe('December 2025');
  });
});

describe('vaner på engelsk', () => {
  const habit = (over: Partial<Habit>): Habit => ({
    id: 'h',
    name: 'Vann',
    color: 'himmel',
    type: 'check',
    target: 1,
    unit: '',
    schedule: { kind: 'daily' },
    reminder: null,
    createdAt: '2026-10-01',
    ...over,
  });

  it('beskriver hvor ofte og hvor mye', () => {
    setLang('en');
    expect(frequencyText(habit({}))).toBe('Every day');
    expect(frequencyText(habit({ schedule: { kind: 'weekly', times: 1 } }))).toBe('1 time a week');
    expect(frequencyText(habit({ schedule: { kind: 'weekly', times: 3 } }))).toBe('3 times a week');
    expect(frequencyText(habit({ schedule: { kind: 'days', days: [true, false, true, false, true, false, false] } }))).toBe('Mon, Wed, Fri');
    expect(amountText(habit({ type: 'count', target: 8, unit: 'glasses' }), 5)).toBe('5 of 8 glasses');
    expect(amountText(habit({ type: 'count', target: 8 }), 5)).toBe('5 of 8 times');
  });

  it('oppsummerer en periode', () => {
    setLang('en');
    const h = habit({});
    const data: Data = { ...EMPTY_DATA, habits: [h], logs: { '2026-10-16': { h: 1 }, '2026-10-17': { h: 1 } } };
    expect(summaryText(periodSummary(data, h, '2026-10-17', 7))).toBe('2 of 7 days');
  });
});

describe('kategorier og steder', () => {
  const groceries = DEFAULT_CATEGORIES[0];

  it('viser standardkategorier på brukerens språk så lenge de ikke har fått nytt navn', () => {
    expect(categoryName(groceries)).toBe('Dagligvarer');
    setLang('en');
    expect(categoryName(groceries)).toBe('Groceries');
    expect(categoryName({ ...groceries, name: 'Mat' })).toBe('Mat');
    expect(categoryName({ id: 'egen', name: 'Bil' })).toBe('Bil');
  });

  it('lagrer «Ukjent sted» på norsk, og viser det oversatt', () => {
    const data = addPurchase(EMPTY_MONEY, { amount: 100, merchant: ' ', day: '2026-10-17', time: '12:00', parts: [], skipped: false, note: '' }, 'p1');
    expect(data.purchases[0].merchant).toBe(UNKNOWN_PLACE);
    expect(merchantName(data, data.purchases[0])).toBe('Ukjent sted');
    setLang('en');
    expect(merchantName(data, data.purchases[0])).toBe('Unknown place');
    expect(data.purchases[0].merchant).toBe('Ukjent sted');
  });

  it('skriver når et kjøp skjedde, også på engelsk', () => {
    const data = addPurchase(EMPTY_MONEY, { amount: 100, merchant: 'Kiwi', day: '2026-10-16', time: '09:05', parts: [], skipped: false, note: '' }, 'p1');
    setLang('en');
    expect(purchaseWhen(data.purchases[0], '2026-10-17')).toBe('Yesterday 09:05');
    expect(purchaseWhen(data.purchases[0], '2026-10-30')).toBe('Oct 16 09:05');
  });
});

describe('widgetene på engelsk', () => {
  const h: Habit = {
    id: 'h',
    name: 'Walk',
    color: 'salvie',
    type: 'check',
    target: 1,
    unit: '',
    schedule: { kind: 'daily' },
    reminder: null,
    createdAt: '2026-10-01',
  };
  const data: Data = { ...EMPTY_DATA, habits: [h] };
  const noon = new Date(2026, 9, 17, 13, 0);

  it('låseskjermen får ferdig tekst på engelsk', () => {
    setLang('en');
    const props = buildLockProps(data, '2026-10-17', noon);
    expect(props.main).toBe('Walk');
    expect(props.sub).toBe('The last one today');
    expect(props.inline).toBe('Left: Walk');
    expect(props.short).toBe('Goals');
    expect(buildLockProps(data, '2026-10-17', new Date(2026, 9, 17, 8, 0)).main).toBe('Set today’s goals');
  });

  it('hjemskjermen og Penger får teksten med, på telefonens språk', () => {
    expect(buildTodayProps(data, '2026-10-17', noon).text.labelLeft).toBe('IGJEN I DAG');
    setLang('en');
    expect(buildTodayProps(data, '2026-10-17', noon).text.labelLeft).toBe('LEFT TODAY');
    expect(buildPengerProps(2)).toEqual({ waiting: 2, text: stringsFor('en').widgets.money });
  });
});

describe('Swift og app.json', () => {
  const swift = ['LogPurchaseIntent.swift', 'PurchaseNotifications.swift'].map((f) => read('app-intents', f)).join('\n');
  const app = JSON.parse(read('app.json')).expo;
  const en = JSON.parse(read('locales', 'en.json')).ios['Localizable.strings'] as Record<string, string>;

  /** Nøklene iOS slår opp: `\(\.$amount)` blir `${amount}`, annen interpolasjon blir `%@`. */
  const keys = [
    ...[...swift.matchAll(/LocalizedStringResource = "([^"]+)"/g)].map((m) => m[1]),
    ...[...swift.matchAll(/@Parameter\(title: "([^"]+)"/g)].map((m) => m[1]),
    ...[...swift.matchAll(/Summary\("([^"]+)"\)/g)].map((m) => m[1].replace(/\\\(\\\.\$(\w+)\)/g, '${$1}')),
    ...[...swift.matchAll(/String\(localized: "([^"]+)"\)/g)].map((m) => m[1].replace(/\\\([^)]*\)/g, '%@')),
  ];
  const widgetTexts = (app.plugins as unknown[])
    .filter((p): p is [string, { widgets: { displayName: string; description: string }[] }] => Array.isArray(p) && p[0] === 'expo-widgets')
    .flatMap(([, options]) => options.widgets.flatMap((w) => [w.displayName, w.description]));

  it('har engelsk for all tekst Swift og widgetene viser', () => {
    expect(keys.length).toBeGreaterThanOrEqual(8);
    for (const key of [...keys, ...widgetTexts]) expect([key, en[key]]).toEqual([key, expect.any(String)]);
  });

  it('har ingen engelske tekster som ikke brukes', () => {
    const used = new Set([...keys, ...widgetTexts]);
    expect(Object.keys(en).filter((k) => !used.has(k))).toEqual([]);
  });

  it('har de samme %@ og ${…} på begge språk', () => {
    const holes = (s: string) => (s.match(/%@|\$\{\w+\}/g) ?? []).sort();
    for (const [key, value] of Object.entries(en)) expect([key, holes(value)]).toEqual([key, holes(key)]);
  });

  it('har norsk for de samme tekstene, så widget-målet også får norsk (ellers faller det tilbake til engelsk)', () => {
    const nb = JSON.parse(read('locales', 'nb.json')).ios['Localizable.strings'] as Record<string, string>;
    expect(nb).toEqual(Object.fromEntries(Object.keys(en).map((k) => [k, k])));
  });

  it('sier at appen finnes på norsk og engelsk, og faller tilbake til engelsk som appen', () => {
    expect(app.ios.infoPlist.CFBundleLocalizations).toEqual(['nb', 'en']);
    expect(app.ios.infoPlist.CFBundleDevelopmentRegion).toBe('en');
    expect(Object.keys(app.locales)).toEqual(['nb', 'en']);
    expect(langFromLocales([{ languageCode: 'da' }])).toBe('en');
  });
});

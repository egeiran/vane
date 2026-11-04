import { describe, expect, it } from '@jest/globals';

import { addDays } from '../dates';
import { EMPTY_MONEY } from '../money';
import { addPurchase } from '../moneyState';
import {
  categorizedPurchases,
  checkOffs,
  EMPTY_REVIEW,
  firstUseDay,
  loadReview,
  REVIEW_AFTER_COUNT,
  REVIEW_AFTER_DAYS,
  shouldAskForReview,
  WRITE_REVIEW_URL,
} from '../review';
import { addHabit, loadData, setValue } from '../state';
import type { Data, MoneyData } from '../types';

// Jest kjører i Node, men Node-typene er ikke med i prosjektet.
declare const require: (id: string) => unknown;
declare const __dirname: string;
const { readFileSync } = require('fs') as { readFileSync: (path: string, encoding: 'utf8') => string };

const TODAY = '2026-11-04';
const habit = { name: 'Gå en tur', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: null } as const;

/** En bruker som startet `daysAgo` dager siden og har huket av `n` ganger. */
function user(daysAgo: number, n: number): Data {
  let data = addHabit({ ...loadData(undefined), settings: { ...loadData(undefined).settings, onboarded: true } }, habit, addDays(TODAY, -daysAgo), 'h1');
  for (let i = 0; i < n; i++) data = setValue(data, 'h1', addDays(TODAY, -i), 1);
  return data;
}

function purchases(n: number, withCategory: boolean): MoneyData {
  let money = EMPTY_MONEY;
  for (let i = 0; i < n; i++) {
    money = addPurchase(
      money,
      { amount: 100, merchant: 'Kiosk', day: TODAY, time: '12:00', parts: withCategory ? [{ categoryId: 'annet', amount: 100 }] : [], skipped: false, note: '' },
      `p${i}`
    );
  }
  return money;
}

const ask = (data: Data, money: MoneyData = EMPTY_MONEY, review = EMPTY_REVIEW, version = '1.0.0') =>
  shouldAskForReview({ review, data, money, today: TODAY, version });

describe('når Vane spør om en vurdering', () => {
  it('spør etter 14 dager og 20 avhukinger', () => {
    expect(REVIEW_AFTER_DAYS).toBe(14);
    expect(REVIEW_AFTER_COUNT).toBe(20);
    expect(ask(user(14, 20))).toBe(true);
  });

  it('venter til det har gått 14 hele dager', () => {
    // To vaner, huket av de siste ti dagene: 20 avhukinger, og første bruk er dagen vanene kom.
    const twoHabits = (daysAgo: number) => {
      let data = user(daysAgo, 10);
      data = addHabit(data, { ...habit, name: 'Lese' }, addDays(TODAY, -daysAgo), 'h2');
      for (let i = 0; i < 10; i++) data = setValue(data, 'h2', addDays(TODAY, -i), 1);
      return data;
    };
    expect(checkOffs(twoHabits(13))).toBe(20);
    expect(ask(twoHabits(13))).toBe(false);
    expect(ask(twoHabits(14))).toBe(true);
  });

  it('venter til det er 20 avhukinger eller 20 kjøp med kategori', () => {
    expect(ask(user(30, 19))).toBe(false);
    expect(ask(user(30, 0), purchases(20, true))).toBe(true);
    expect(ask(user(30, 0), purchases(20, false))).toBe(false);
  });

  it('spør høyst én gang per versjon', () => {
    const data = user(30, 25);
    expect(ask(data, EMPTY_MONEY, { firstUse: null, askedVersion: '1.0.0' }, '1.0.0')).toBe(false);
    expect(ask(data, EMPTY_MONEY, { firstUse: null, askedVersion: '1.0.0' }, '1.1.0')).toBe(true);
  });

  it('spør ikke før oppstarten er ferdig', () => {
    const data = user(30, 25);
    expect(ask({ ...data, settings: { ...data.settings, onboarded: false } })).toBe(false);
  });

  it('teller første bruk fra den lagrede dagen, den første vanen eller den første avhukingen', () => {
    const data = user(40, 1);
    expect(firstUseDay(EMPTY_REVIEW, data, TODAY)).toBe(addDays(TODAY, -40));
    expect(firstUseDay({ firstUse: '2026-01-01', askedVersion: null }, data, TODAY)).toBe('2026-01-01');
    expect(firstUseDay(EMPTY_REVIEW, loadData(undefined), TODAY)).toBe(TODAY);
    // Gamle data uten lagret dag: en avhuking eldre enn vanen teller også.
    const old = setValue(data, 'h1', addDays(TODAY, -60), 1);
    expect(firstUseDay(EMPTY_REVIEW, old, TODAY)).toBe(addDays(TODAY, -60));
  });

  it('teller avhukinger og kjøp med kategori', () => {
    expect(checkOffs(user(10, 7))).toBe(7);
    expect(categorizedPurchases(purchases(3, true))).toBe(3);
    expect(categorizedPurchases(purchases(3, false))).toBe(0);
  });

  it('leser det lagrede, også når det mangler eller er ødelagt', () => {
    expect(loadReview(null)).toEqual(EMPTY_REVIEW);
    expect(loadReview('ikke json')).toEqual(EMPTY_REVIEW);
    expect(loadReview('{"firstUse":"2026-10-01","askedVersion":7}')).toEqual({ firstUse: '2026-10-01', askedVersion: null });
  });

  it('åpner skrivefeltet i App Store for Vane, med ID-en fra eas.json', () => {
    const eas = JSON.parse(readFileSync([__dirname, '..', '..', '..', 'eas.json'].join('/'), 'utf8'));
    expect(WRITE_REVIEW_URL).toBe(`https://apps.apple.com/app/id${eas.submit.production.ios.ascAppId}?action=write-review`);
  });
});

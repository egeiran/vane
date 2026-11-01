import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import { dayOfWeek, displayTime, startOfWeek, weekOrder } from '../dates';
import { daysInRange, weekRows } from '../grid';
import { frequencyText, weekCount } from '../habits';
import { amountInputText, currencyLabel, EMPTY_MONEY, formatAmount, mainCurrency, monthSummary, nativePurchaseConfig, parseAmount } from '../money';
import { addPurchase, categorize, importPurchase, loadMoney } from '../moneyState';
import { NORWEGIAN_REGION, regionFrom, setDeviceRegion, showsWeekNumber, showTime, weekStartOf } from '../region';
import { DEFAULT_SETTINGS, EMPTY_DATA, type Data, type Habit, type MoneyData } from '../types';
import { buildLockProps, buildTodayProps } from '../widgetProps';

const US = { currency: 'USD', weekStart: 'sun' as const, clock24: false };

afterEach(() => {
  setLang('nb');
  setDeviceRegion(NORWEGIAN_REGION);
});

describe('det telefonen sier', () => {
  it('leser ukestart med Apples tall på iPhone: 1 er søndag, 2 er mandag', () => {
    const cal = (firstWeekday: number | null) => ({ firstWeekday, uses24hourClock: true });
    expect(regionFrom({ currencyCode: 'NOK' }, cal(2), 'ios').weekStart).toBe('mon');
    expect(regionFrom({ currencyCode: 'USD' }, cal(1), 'ios').weekStart).toBe('sun');
    // Lørdag (7) og ukjent blir mandag.
    expect(regionFrom({ currencyCode: 'AED' }, cal(7), 'ios').weekStart).toBe('mon');
    expect(regionFrom(undefined, undefined, 'ios').weekStart).toBe('mon');
  });

  it('leser ukestart med ISO-tall på web, der expo-localization gir 7 for søndag', () => {
    const cal = (firstWeekday: number) => ({ firstWeekday, uses24hourClock: false });
    expect(regionFrom({ currencyCode: null }, cal(7), 'web').weekStart).toBe('sun');
    expect(regionFrom({ currencyCode: null }, cal(1), 'web').weekStart).toBe('mon');
  });

  it('bruker kroner og 24 timer når telefonen ikke sier noe', () => {
    expect(regionFrom({ currencyCode: null }, { firstWeekday: null, uses24hourClock: null }, 'web')).toEqual(NORWEGIAN_REGION);
    expect(regionFrom({ currencyCode: 'usd' }, { firstWeekday: 1, uses24hourClock: false }, 'ios')).toEqual(US);
  });

  it('lar brukerens valg av ukestart gå foran telefonen', () => {
    setDeviceRegion(US);
    expect(weekStartOf(DEFAULT_SETTINGS)).toBe('sun');
    expect(weekStartOf({ weekStart: 'mon' })).toBe('mon');
  });

  it('gir ukestart fra før denne versjonen «som telefonen»', () => {
    const old = { morningEnabled: true, morningTime: '07:00', remindersEnabled: false };
    expect({ ...DEFAULT_SETTINGS, ...old }.weekStart).toBeNull();
    expect(EMPTY_MONEY.currency).toBeNull();
    setDeviceRegion(US);
    expect(mainCurrency({ currency: null })).toBe('USD');
    expect(mainCurrency({ currency: 'EUR' })).toBe('EUR');
  });
});

describe('pengedata som lastes', () => {
  it('gir data fra før hovedvalutaen fantes NOK, fordi alt da var i kroner', () => {
    const old = { categories: [], purchases: [], merchants: {}, imported: [], setupSeen: true };
    expect(loadMoney(old).currency).toBe('NOK');
    expect(loadMoney(old).categories.length).toBeGreaterThan(0);
  });

  it('lar en ny installasjon følge telefonen', () => {
    expect(loadMoney(undefined).currency).toBeNull();
    expect(loadMoney(null).currency).toBeNull();
  });

  it('beholder det brukeren har valgt', () => {
    expect(loadMoney({ ...EMPTY_MONEY, currency: 'EUR' }).currency).toBe('EUR');
    expect(loadMoney({ ...EMPTY_MONEY, currency: null }).currency).toBeNull();
  });
});

describe('ukestart', () => {
  // Onsdag 4. november 2026. Søndag 1. og mandag 2. november er i samme uke bare når uka starter på søndag.
  const WED = '2026-11-04';

  it('finner første dag i uka', () => {
    expect(startOfWeek(WED, 'mon')).toBe('2026-11-02');
    expect(startOfWeek(WED, 'sun')).toBe('2026-11-01');
    expect(startOfWeek('2026-11-01', 'mon')).toBe('2026-10-26');
    expect(startOfWeek('2026-11-01', 'sun')).toBe('2026-11-01');
    expect(dayOfWeek(WED, 'mon')).toBe(2);
    expect(dayOfWeek(WED, 'sun')).toBe(3);
  });

  it('viser ukedagene i ukas rekkefølge, men med mandag = 0 i dataene', () => {
    expect(weekOrder('mon')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekOrder('sun')).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });

  it('teller ukentlige vaner i riktig uke', () => {
    const h: Habit = {
      id: 'h',
      name: 'Trene',
      color: 'fersken',
      type: 'check',
      target: 1,
      unit: '',
      schedule: { kind: 'weekly', times: 3 },
      reminder: null,
      createdAt: '2026-10-01',
    };
    const data = { logs: { '2026-11-01': { h: 1 }, '2026-11-02': { h: 1 } } };
    expect(weekCount(data, h, WED, 'mon')).toBe(1);
    expect(weekCount(data, h, WED, 'sun')).toBe(2);
    expect(weekCount(data, h, WED)).toBe(1);
  });

  it('lager rutenettet fra første dag i uka', () => {
    expect(weekRows(WED, 1, 'sun')[0][0]).toBe('2026-11-01');
    expect(weekRows(WED, 1, 'mon')[0][0]).toBe('2026-11-02');
    expect(weekRows(WED, 4, 'sun')[0][0]).toBe('2026-10-11');
    expect(daysInRange(WED, 1, 'mon')).toBe(3);
    expect(daysInRange(WED, 1, 'sun')).toBe(4);
  });

  it('lister valgte ukedager i ukas rekkefølge', () => {
    const h: Habit = {
      id: 'h',
      name: 'Lese',
      color: 'lavendel',
      type: 'check',
      target: 1,
      unit: '',
      schedule: { kind: 'days', days: [true, false, true, false, false, false, true] },
      reminder: null,
      createdAt: '2026-10-01',
    };
    expect(frequencyText(h, 'mon')).toBe('Man, Ons, Søn');
    expect(frequencyText(h, 'sun')).toBe('Søn, Man, Ons');
  });

  it('viser ukenummer bare på norsk med mandag som første dag', () => {
    expect(showsWeekNumber('mon')).toBe(true);
    expect(showsWeekNumber('sun')).toBe(false);
    setLang('en');
    expect(showsWeekNumber('mon')).toBe(false);
  });
});

describe('klokka', () => {
  it('viser 24 timer som før', () => {
    expect(displayTime('18:05', true)).toBe('18:05');
    expect(displayTime('07:00', true)).toBe('07:00');
  });

  it('viser 12 timer når telefonen bruker det', () => {
    setLang('en');
    expect(displayTime('18:05', false)).toBe('6:05 PM');
    expect(displayTime('00:30', false)).toBe('12:30 AM');
    expect(displayTime('12:00', false)).toBe('12:00 PM');
    expect(displayTime('07:00', false)).toBe('7:00 AM');
    setLang('nb');
    expect(displayTime('18:05', false)).toBe('6:05 p.m.');
  });

  it('følger telefonen', () => {
    expect(showTime('18:00')).toBe('18:00');
    setDeviceRegion(US);
    setLang('en');
    expect(showTime('18:00')).toBe('6:00 PM');
  });
});

describe('beløp slik Snarveier gir dem', () => {
  const amount = (text: string, main: string) => {
    const p = parseAmount(text, main);
    return p && `${p.amount} ${p.currency}`;
  };

  it('på amerikansk, engelsk og tysk telefon', () => {
    expect(amount('$12.50', 'USD')).toBe('1250 USD');
    expect(amount('12,50 €', 'EUR')).toBe('1250 EUR');
    expect(amount('£3.20', 'GBP')).toBe('320 GBP');
    expect(amount('1,234.50', 'USD')).toBe('123450 USD');
    expect(amount('$1,234.50', 'USD')).toBe('123450 USD');
    expect(amount('1.234,50 €', 'EUR')).toBe('123450 EUR');
  });

  it('lar $ være hovedvalutaen når den er en dollar', () => {
    expect(amount('$12.50', 'CAD')).toBe('1250 CAD');
    expect(amount('$12.50', 'AUD')).toBe('1250 AUD');
    expect(amount('$12.50', 'NOK')).toBe('1250 USD');
    expect(amount('$12.50', 'EUR')).toBe('1250 USD');
  });

  it('lar «kr» være hovedvalutaen når den er en krone', () => {
    expect(amount('kr 149', 'SEK')).toBe('14900 SEK');
    expect(amount('149 kr', 'DKK')).toBe('14900 DKK');
    expect(amount('kr 149', 'USD')).toBe('14900 NOK');
  });

  it('leser dollar med landskode foran som den dollaren, slik iOS skriver dollar fra andre land', () => {
    expect(amount('US$12.50', 'CAD')).toBe('1250 USD');
    expect(amount('CA$12.50', 'USD')).toBe('1250 CAD');
    expect(amount('A$5', 'USD')).toBe('500 AUD');
    expect(amount('NZ$5', 'USD')).toBe('500 NZD');
    expect(amount('R$ 10,00', 'BRL')).toBe('1000 BRL');
    expect(amount('R$ 10,00', 'NOK')).toBe('1000 BRL');
    // Ukjent landskode: som en $ alene.
    expect(amount('X$5', 'CAD')).toBe('500 CAD');
  });

  it('gir et beløp uten valuta hovedvalutaen', () => {
    expect(amount('149', 'USD')).toBe('14900 USD');
    expect(amount('149', 'NOK')).toBe('14900 NOK');
    expect(amount('12.50', 'EUR')).toBe('1250 EUR');
  });

  it('er som før med kroner som hovedvaluta', () => {
    expect(amount('kr 149,00', 'NOK')).toBe('14900 NOK');
    expect(amount('1 234,50 kr', 'NOK')).toBe('123450 NOK');
    expect(amount('€12.50', 'NOK')).toBe('1250 EUR');
    expect(parseAmount('149')).toEqual({ amount: 14900, currency: 'NOK' });
  });
});

describe('beløp på skjermen', () => {
  /** Beløpene bruker hardt mellomrom, så de ikke brytes over to linjer. */
  const hard = (s: string) => s.replace(/ /g, '\u00a0');

  it('norsk er som før', () => {
    expect(formatAmount(123450, 'NOK', 'nb')).toBe(hard('1 234,50 kr'));
    expect(formatAmount(14900, 'NOK', 'nb')).toBe(hard('149 kr'));
    expect(formatAmount(1250, 'EUR', 'nb')).toBe(hard('12,50 EUR'));
    expect(currencyLabel('NOK', 'nb')).toBe('kr');
    expect(amountInputText(14950, 'nb')).toBe('149,50');
  });

  it('engelsk har tegnet foran og punktum som desimaltegn', () => {
    expect(formatAmount(123450, 'USD', 'en')).toBe('$1,234.50');
    expect(formatAmount(1250, 'EUR', 'en')).toBe('€12.50');
    expect(formatAmount(320, 'GBP', 'en')).toBe('£3.20');
    expect(formatAmount(14900, 'NOK', 'en')).toBe(hard('NOK 149'));
    expect(formatAmount(1234500, 'CAD', 'en')).toBe(hard('CAD 12,345'));
    expect(currencyLabel('USD', 'en')).toBe('$');
    expect(currencyLabel('NOK', 'en')).toBe('NOK');
    expect(amountInputText(14950, 'en')).toBe('149.50');
  });
});

describe('hovedvaluta i Penger', () => {
  const at = new Date(2026, 10, 4, 12, 0);
  const usd = (data: MoneyData): MoneyData => ({ ...data, currency: 'USD' });

  it('tar inn beløp uten valuta i hovedvalutaen', () => {
    const d = importPurchase(usd(EMPTY_MONEY), { id: 'a', amountText: '12.50', merchant: 'Target', at });
    expect(d.purchases[0]).toMatchObject({ amount: 1250, currency: 'USD' });
    const manual = addPurchase(usd(EMPTY_MONEY), { amount: 500, merchant: 'Cash', day: '2026-11-04', time: '12:00', parts: [], skipped: false, note: '' }, 'b');
    expect(manual.purchases[0].currency).toBe('USD');
  });

  it('summerer hovedvalutaen og viser andre valutaer for seg', () => {
    let d = usd(EMPTY_MONEY);
    d = importPurchase(d, { id: 'a', amountText: '$12.50', merchant: 'Target', at });
    d = importPurchase(d, { id: 'b', amountText: 'kr 149', merchant: 'Rema', at });
    d = categorize(d, 'a', 'dagligvarer');
    const s = monthSummary(d, '2026-11');
    expect(s.currency).toBe('USD');
    expect(s.total).toBe(1250);
    expect(s.other).toEqual({ NOK: 14900 });
  });

  it('er som før for norske brukere', () => {
    let d = importPurchase(EMPTY_MONEY, { id: 'a', amountText: '149', merchant: 'Rema', at });
    d = importPurchase(d, { id: 'b', amountText: '$5', merchant: 'Apple', at });
    const s = monthSummary(d, '2026-11');
    expect(s.currency).toBe('NOK');
    expect(s.total).toBe(14900);
    expect(s.other).toEqual({ USD: 500 });
  });

  it('sender hovedvalutaen til Swift', () => {
    expect(nativePurchaseConfig(EMPTY_MONEY).currency).toBe('NOK');
    expect(nativePurchaseConfig(usd(EMPTY_MONEY)).currency).toBe('USD');
  });
});

describe('widgetene med 12-timersklokke', () => {
  const h: Habit = {
    id: 'h',
    name: 'Walk',
    color: 'salvie',
    type: 'check',
    target: 1,
    unit: '',
    schedule: { kind: 'daily' },
    reminder: '18:00',
    createdAt: '2026-10-01',
  };
  const data: Data = { ...EMPTY_DATA, habits: [h] };
  const noon = new Date(2026, 10, 4, 13, 0);

  it('sender klokkeslettet slik telefonen viser det, og beholder HH:MM til sortering', () => {
    expect(buildTodayProps(data, '2026-11-04', noon).items[0]).toMatchObject({ time: '18:00', timeLabel: '18:00' });
    setDeviceRegion(US);
    setLang('en');
    expect(buildTodayProps(data, '2026-11-04', noon).items[0]).toMatchObject({ time: '18:00', timeLabel: '6:00 PM' });
    expect(buildLockProps(data, '2026-11-04', noon).sub).toBe('at 6:00 PM');
  });
});

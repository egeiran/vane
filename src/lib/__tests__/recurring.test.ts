import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import { EMPTY_MONEY } from '../money';
import { addPurchase, loadMoney } from '../moneyState';
import {
  addRecurring,
  chargeAt,
  deleteRecurring,
  dismissSuggestion,
  MAX_RECURRING_REMINDERS,
  RECURRING_DAYS_AHEAD,
  MAX_SUGGESTIONS,
  monthlyAmount,
  nextCharge,
  planRecurringReminders,
  recurringOn,
  recurringSummary,
  shiftMonths,
  suggestRecurring,
  updateRecurring,
  upcomingRecurring,
  type RecurringInput,
} from '../recurring';
import { DEFAULT_SETTINGS, type MoneyData, type RecurringFrequency } from '../types';

const TODAY = '2026-11-04';
const NOK: MoneyData = { ...EMPTY_MONEY, currency: 'NOK' };

const input = (patch: Partial<RecurringInput> = {}): RecurringInput => ({
  name: 'Netflix',
  amount: 14900,
  frequency: 'month',
  anchor: '2026-10-20',
  categoryId: 'fritid',
  note: '',
  remind: false,
  ...patch,
});

const schedule = (anchor: string, frequency: RecurringFrequency) => ({ anchor, frequency });

afterEach(() => setLang('nb'));

describe('neste trekk', () => {
  it('holder seg på den 31. etter en kort måned', () => {
    const e = schedule('2026-01-31', 'month');
    expect(chargeAt(e, 1)).toBe('2026-02-28');
    expect(chargeAt(e, 2)).toBe('2026-03-31');
    expect(chargeAt(e, 3)).toBe('2026-04-30');
    expect(nextCharge(e, '2026-02-01')).toBe('2026-02-28');
    expect(nextCharge(e, '2026-03-01')).toBe('2026-03-31');
    expect(nextCharge(e, '2028-02-01')).toBe('2028-02-29');
  });

  it('er i dag når det trekkes i dag, og ankeret når det er fram i tid', () => {
    expect(nextCharge(schedule('2026-10-04', 'month'), TODAY)).toBe('2026-11-04');
    expect(nextCharge(schedule('2026-10-03', 'month'), TODAY)).toBe('2026-12-03');
    expect(nextCharge(schedule('2026-12-01', 'month'), TODAY)).toBe('2026-12-01');
    expect(nextCharge(schedule('2027-06-01', 'year'), TODAY)).toBe('2027-06-01');
  });

  it('går en uke om gangen', () => {
    const e = schedule('2026-10-28', 'week');
    expect(nextCharge(e, TODAY)).toBe('2026-11-04');
    expect(nextCharge(e, '2026-11-05')).toBe('2026-11-11');
    expect(nextCharge(e, '2027-01-01')).toBe('2027-01-06');
  });

  it('går ett år om gangen, og 29. februar er 28. februar i vanlige år', () => {
    expect(nextCharge(schedule('2025-12-24', 'year'), TODAY)).toBe('2026-12-24');
    expect(nextCharge(schedule('2024-02-29', 'year'), TODAY)).toBe('2027-02-28');
    expect(nextCharge(schedule('2024-02-29', 'year'), '2027-03-01')).toBe('2028-02-29');
  });

  it('flytter en dag en måned fram eller tilbake', () => {
    expect(shiftMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftMonths('2026-03-31', -1)).toBe('2026-02-28');
  });
});

describe('hva som går ut i måneden', () => {
  it('regner om uke og år til en vanlig måned', () => {
    expect(monthlyAmount({ amount: 10000, frequency: 'week' })).toBe(43333);
    expect(monthlyAmount({ amount: 14900, frequency: 'month' })).toBe(14900);
    expect(monthlyAmount({ amount: 120000, frequency: 'year' })).toBe(10000);
  });

  it('teller bare hovedvalutaen i summen, og andre valutaer for seg', () => {
    let d = addRecurring(NOK, input({ name: 'Trening', amount: 10000, frequency: 'week' }), 'a');
    d = addRecurring(d, input(), 'b');
    d = addRecurring(d, input({ name: 'Forsikring', amount: 120000, frequency: 'year' }), 'c');
    d = { ...d, recurring: [...d.recurring, { ...d.recurring[1], id: 'd', name: 'Spotify', currency: 'EUR', amount: 999 }] };
    // 433,33 + 149 + 100 kr, avrundet én gang.
    expect(recurringSummary(d)).toEqual({
      currency: 'NOK',
      perMonth: 68233,
      other: { EUR: 999 },
      totals: [
        { currency: 'NOK', amount: 68233 },
        { currency: 'EUR', amount: 999 },
      ],
      count: 4,
    });
    expect(recurringSummary(NOK)).toEqual({ currency: 'NOK', perMonth: 0, other: {}, totals: [], count: 0 });
  });

  it('viser ikke «0 kr» først når alle er i en annen valuta enn hovedvalutaen', () => {
    const d = addRecurring(NOK, input({ name: 'Husleie', amount: 950000 }), 'a');
    expect(recurringSummary({ ...d, currency: 'EUR' }).totals).toEqual([{ currency: 'NOK', amount: 950000 }]);
  });

  it('er en egen linje: kjøpene og månedens sum endres ikke', () => {
    const d = addRecurring(NOK, input(), 'a');
    expect(d.purchases).toBe(NOK.purchases);
  });

  it('sorterer etter neste trekk', () => {
    let d = addRecurring(NOK, input({ name: 'Husleie', amount: 950000, anchor: '2026-12-01' }), 'a');
    d = addRecurring(d, input({ name: 'Netflix', anchor: '2026-10-20' }), 'b');
    d = addRecurring(d, input({ name: 'Strøm', amount: 80000, anchor: '2026-10-20' }), 'c');
    expect(upcomingRecurring(d, TODAY).map((u) => [u.expense.name, u.next])).toEqual([
      ['Strøm', '2026-11-20'],
      ['Netflix', '2026-11-20'],
      ['Husleie', '2026-12-01'],
    ]);
  });
});

describe('legge inn og endre', () => {
  it('legger inn i hovedvalutaen, med navn og notat ryddet', () => {
    const d = addRecurring(NOK, input({ name: '  Netflix ', note: ' Deles med Ola ' }), 'a');
    expect(d.recurring).toEqual([
      { id: 'a', name: 'Netflix', amount: 14900, currency: 'NOK', frequency: 'month', anchor: '2026-10-20', categoryId: 'fritid', note: 'Deles med Ola', remind: false, merchantKey: '' },
    ]);
    expect(addRecurring({ ...NOK, currency: 'EUR' }, input(), 'a').recurring[0].currency).toBe('EUR');
    expect(addRecurring(NOK, input({ merchantKey: 'NETFLIX' }), 'a').recurring[0].merchantKey).toBe('NETFLIX');
  });

  it('legger ikke inn noe uten navn eller beløp', () => {
    for (const bad of [input({ name: ' ' }), input({ amount: 0 }), input({ amount: -100 }), input({ amount: 1.5 })]) {
      expect(addRecurring(NOK, bad, 'a')).toBe(NOK);
    }
  });

  it('endrer, og lar valutaen og stedet stå', () => {
    const d = addRecurring({ ...NOK, currency: 'EUR' }, input({ merchantKey: 'NETFLIX' }), 'a');
    const changed = updateRecurring({ ...d, currency: 'NOK' }, 'a', { amount: 17900, frequency: 'year', remind: true, categoryId: null });
    expect(changed.recurring[0]).toMatchObject({ amount: 17900, frequency: 'year', remind: true, categoryId: null, currency: 'EUR', merchantKey: 'NETFLIX' });
    expect(updateRecurring(d, 'a', { name: '' })).toBe(d);
    expect(updateRecurring(d, 'a', { amount: 0 })).toBe(d);
    expect(updateRecurring(d, 'finnes-ikke', { amount: 100 })).toBe(d);
  });

  it('sletter', () => {
    const d = addRecurring(addRecurring(NOK, input(), 'a'), input({ name: 'Strøm' }), 'b');
    expect(deleteRecurring(d, 'a').recurring.map((e) => e.id)).toEqual(['b']);
  });

  it('husker «Ikke foreslå» én gang per sted', () => {
    const d = dismissSuggestion(dismissSuggestion(NOK, 'NETFLIX'), 'NETFLIX');
    expect(d.recurringDismissed).toEqual(['NETFLIX']);
    expect(dismissSuggestion(NOK, '')).toBe(NOK);
  });

  it('gir gamle data tomme lister', () => {
    const old = loadMoney({ purchases: [], categories: EMPTY_MONEY.categories, merchants: {}, imported: [], setupSeen: true });
    expect(old.recurring).toEqual([]);
    expect(old.recurringDismissed).toEqual([]);
    expect(loadMoney(undefined).recurring).toEqual([]);
  });
});

describe('forslag fra kjøpene', () => {
  const buy = (d: MoneyData, merchant: string, amount: number, day: string, extra: { skipped?: boolean; categoryId?: string } = {}) =>
    addPurchase(d, {
      amount,
      merchant,
      day,
      time: '12:00',
      parts: [{ categoryId: extra.categoryId ?? 'fritid', amount }],
      skipped: extra.skipped ?? false,
      note: '',
    });
  const monthly = (d: MoneyData, merchant: string, amounts: number[], days = ['2026-08-15', '2026-09-15', '2026-10-15']) =>
    amounts.reduce((acc, amount, i) => buy(acc, merchant, amount, days[i]), d);

  it('foreslår et sted med ett kjøp i måneden og samme beløp tre måneder på rad', () => {
    const d = monthly(NOK, 'Netflix', [14900, 14900, 14900]);
    expect(suggestRecurring(d, TODAY)).toEqual([{ merchantKey: 'NETFLIX', name: 'Netflix', amount: 14900, anchor: '2026-10-15', categoryId: 'fritid' }]);
  });

  it('godtar litt forskjell i beløpet, men ikke mye', () => {
    expect(suggestRecurring(monthly(NOK, 'Strøm', [10000, 10500, 11000]), TODAY)).toHaveLength(1);
    expect(suggestRecurring(monthly(NOK, 'Strøm', [50000, 80000, 60000]), TODAY)).toEqual([]);
  });

  it('teller med denne måneden når det er trukket', () => {
    const d = monthly(NOK, 'Sats', [49900, 49900, 49900], ['2026-09-03', '2026-10-03', '2026-11-03']);
    expect(suggestRecurring(d, TODAY)[0]).toMatchObject({ name: 'Sats', anchor: '2026-11-03' });
  });

  it('foreslår ikke steder med for få måneder, flere kjøp i måneden eller et gammelt siste kjøp', () => {
    expect(suggestRecurring(monthly(NOK, 'Netflix', [14900, 14900], ['2026-09-15', '2026-10-15']), TODAY)).toEqual([]);
    // Et hull i månedene.
    expect(suggestRecurring(monthly(NOK, 'Netflix', [14900, 14900, 14900], ['2026-07-15', '2026-09-15', '2026-10-15']), TODAY)).toEqual([]);
    const rema = buy(monthly(NOK, 'Rema 1000', [30000, 30000, 30000]), 'Rema 1000', 30000, '2026-10-02');
    expect(suggestRecurring(rema, TODAY)).toEqual([]);
    const old = monthly(NOK, 'Netflix', [14900, 14900, 14900], ['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(suggestRecurring(old, '2026-11-30')).toEqual([]);
  });

  it('ser bort fra kjøp som ikke telles, og kjøp i andre valutaer', () => {
    let d = NOK;
    for (const day of ['2026-08-15', '2026-09-15', '2026-10-15']) d = buy(d, 'Netflix', 14900, day, { skipped: true });
    expect(suggestRecurring(d, TODAY)).toEqual([]);
    const eur = monthly({ ...NOK, currency: 'EUR' }, 'Netflix', [999, 999, 999]);
    expect(suggestRecurring({ ...eur, currency: 'NOK' }, TODAY)).toEqual([]);
  });

  it('foreslår ikke det som er lagt inn, eller det man har sagt nei til', () => {
    const d = monthly(NOK, 'Netflix', [14900, 14900, 14900]);
    expect(suggestRecurring(addRecurring(d, input({ name: 'netflix' }), 'a'), TODAY)).toEqual([]);
    expect(suggestRecurring(addRecurring(d, input({ name: 'Film', merchantKey: 'NETFLIX' }), 'a'), TODAY)).toEqual([]);
    expect(suggestRecurring(dismissSuggestion(d, 'NETFLIX'), TODAY)).toEqual([]);
  });

  it('gir de største først, og bare noen få', () => {
    let d = NOK;
    ['A', 'B', 'C', 'D'].forEach((name, i) => (d = monthly(d, `Sted ${name}`, [1000 * (i + 1), 1000 * (i + 1), 1000 * (i + 1)])));
    const list = suggestRecurring(d, TODAY);
    expect(list).toHaveLength(MAX_SUGGESTIONS);
    expect(list.map((s) => s.name)).toEqual(['Sted D', 'Sted C', 'Sted B']);
  });

  it('tar ikke med en skjult kategori', () => {
    let d = monthly(NOK, 'Netflix', [14900, 14900, 14900]);
    d = { ...d, categories: d.categories.map((c) => (c.id === 'fritid' ? { ...c, hidden: true } : c)) };
    expect(suggestRecurring(d, TODAY)[0].categoryId).toBeNull();
  });
});

describe('varsel dagen før', () => {
  const on = { modules: { ...DEFAULT_SETTINGS.modules, money: true, recurring: true } };
  // Onsdag 4. november 2026 kl. 12
  const NOW = new Date(2026, 10, 4, 12, 0);

  it('følger modulene: både Penger og faste utgifter må være på', () => {
    expect(recurringOn(on)).toBe(true);
    expect(recurringOn({ modules: { ...on.modules, money: false } })).toBe(false);
    expect(recurringOn({ modules: { ...on.modules, recurring: false } })).toBe(false);
    expect(recurringOn(DEFAULT_SETTINGS)).toBe(false);
  });

  it('kommer kl. 09 dagen før neste trekk', () => {
    const d = addRecurring(NOK, input({ remind: true }), 'r1');
    expect(planRecurringReminders(d, on, NOW)).toEqual([
      {
        id: 'recurring:r1:2026-11-20',
        date: new Date(2026, 10, 19, 9, 0),
        title: 'Netflix',
        body: 'I morgen trekkes 149 kr.',
        data: { kind: 'recurring', recurringId: 'r1', day: '2026-11-20' },
      },
    ]);
    setLang('en');
    expect(planRecurringReminders(d, on, NOW)[0].body).toBe('NOK 149 will be charged tomorrow.');
  });

  it('gjelder trekket etter når tidspunktet er passert', () => {
    let d = addRecurring(NOK, input({ remind: true, anchor: '2026-10-05' }), 'tomorrow');
    d = addRecurring(d, input({ remind: true, anchor: '2026-10-04' }), 'today');
    const plan = planRecurringReminders(d, on, NOW);
    expect(plan.map((r) => r.id)).toEqual(['recurring:today:2026-12-04', 'recurring:tomorrow:2026-12-05']);
    expect(plan[0].date).toEqual(new Date(2026, 11, 3, 9, 0));
    // Før kl. 09 dagen før kommer det fortsatt.
    expect(planRecurringReminders(d, on, new Date(2026, 10, 4, 8, 0))[0].id).toBe('recurring:tomorrow:2026-11-05');
  });

  it('kommer ikke når varselet er av, eller modulen er av', () => {
    const off = addRecurring(NOK, input(), 'r1');
    expect(planRecurringReminders(off, on, NOW)).toEqual([]);
    const d = addRecurring(NOK, input({ remind: true }), 'r1');
    expect(planRecurringReminders(d, DEFAULT_SETTINGS, NOW)).toEqual([]);
    expect(planRecurringReminders(d, { modules: { ...on.modules, money: false } }, NOW)).toEqual([]);
  });

  it('legger inn bare de nærmeste', () => {
    let d = NOK;
    for (let i = 0; i < 10; i++) d = addRecurring(d, input({ remind: true, anchor: `2026-11-${10 + i}` }), `r${i}`);
    const plan = planRecurringReminders(d, on, NOW);
    expect(plan).toHaveLength(MAX_RECURRING_REMINDERS);
    expect(plan.map((r) => r.data.recurringId)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
  });

  it('varsler før hvert trekk de neste ukene, og alltid før neste', () => {
    // Hver mandag: 9., 16., 23., 30. november og 7. desember er innenfor fem uker.
    const weekly = addRecurring(NOK, input({ remind: true, frequency: 'week', anchor: '2026-11-02' }), 'w');
    expect(RECURRING_DAYS_AHEAD).toBe(35);
    expect(planRecurringReminders(weekly, on, NOW).map((r) => r.data.day)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07']);
    // Et årlig trekk om ti måneder får likevel varsel.
    const yearly = addRecurring(NOK, input({ remind: true, frequency: 'year', anchor: '2026-09-01' }), 'y');
    expect(planRecurringReminders(yearly, on, NOW).map((r) => r.id)).toEqual(['recurring:y:2027-09-01']);
  });
});

describe('mange kjøp fra samme sted', () => {
  it('går raskt, også med en stor fil der alle kjøpene er fra samme sted samme måned', () => {
    const p = { amount: 100, currency: 'NOK', merchant: 'X', merchantKey: 'X', day: TODAY, time: '12:00', parts: [], skipped: false, note: '', source: 'manual' as const };
    const purchases = Array.from({ length: 100_000 }, (_, i) => ({ ...p, id: `p${i}` }));
    const start = Date.now();
    expect(suggestRecurring({ ...NOK, purchases }, TODAY)).toEqual([]);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

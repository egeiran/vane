import { describe, expect, it } from '@jest/globals';

import {
  addMonths,
  amountInputText,
  cleanMerchant,
  EMPTY_MONEY,
  findPurchases,
  formatAmount,
  merchantKey,
  merchantName,
  monthName,
  monthSummary,
  nativePurchaseConfig,
  parseAmount,
  pendingPurchases,
  purchaseWhen,
  recentMonths,
  suggestionFor,
} from '../money';
import {
  addCategory,
  addPurchase,
  approveAllSuggestions,
  approveSuggestion,
  categorize,
  deletePurchase,
  importPurchase,
  moveCategory,
  partsAreValid,
  renameMerchant,
  updateCategory,
  updatePurchase,
  type PurchaseInput,
} from '../moneyState';
import type { MoneyData } from '../types';

const TODAY = '2026-10-26';

const pay = (id: string, amountText: string, merchant: string, at = new Date(2026, 9, 26, 14, 32)) => ({
  id,
  amountText,
  merchant,
  at,
});

const manual: PurchaseInput = {
  amount: 25000,
  merchant: 'Vipps til Ola',
  day: TODAY,
  time: '12:00',
  parts: [{ categoryId: 'fritid', amount: 25000 }],
  skipped: false,
  note: '',
};

// Samme eksempler som Swift-koden i app-intents/PurchaseText.swift skal gi.
describe('beløp fra Snarveier', () => {
  it.each([
    ['kr 149,00', 14900, 'NOK'],
    ['149,00 kr', 14900, 'NOK'],
    ['kr 1 234,50', 123450, 'NOK'],
    ['1 234,50 kr', 123450, 'NOK'],
    ['NOK 89', 8900, 'NOK'],
    ['149,-', 14900, 'NOK'],
    ['149', 14900, 'NOK'],
    ['149.5', 14950, 'NOK'],
    ['1.234', 123400, 'NOK'],
    ['1,234.50', 123450, 'NOK'],
    ['12.345,67 kr', 1234567, 'NOK'],
    ['€12.50', 1250, 'EUR'],
    ['12,50 €', 1250, 'EUR'],
    ['$3.99', 399, 'USD'],
    ['SEK 45,00', 4500, 'SEK'],
    ['0,29', 29, 'NOK'],
  ])('%s', (text, amount, currency) => {
    expect(parseAmount(text)).toEqual({ amount, currency });
  });

  it('gir null uten tall', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('kr')).toBeNull();
  });

  it('skriver beløp slik appen viser dem', () => {
    expect(formatAmount(14900)).toBe('149 kr');
    expect(formatAmount(123450)).toBe('1 234,50 kr');
    expect(formatAmount(100000000)).toBe('1 000 000 kr');
    expect(formatAmount(1250, 'EUR')).toBe('12,50 EUR');
    expect(formatAmount(5)).toBe('0,05 kr');
    expect(amountInputText(14950)).toBe('149,50');
    expect(amountInputText(14900)).toBe('149');
    expect(amountInputText(0)).toBe('');
  });
});

describe('stedsnavn', () => {
  it.each([
    ['SUMUP *KAFE FUGLEN', 'Kafe Fuglen'],
    ['REMA 1000 MAJORSTUEN', 'Rema 1000 Majorstuen'],
    ['KIWI 505 BOGSTADVEIEN 0123456 NO', 'Kiwi 505 Bogstadveien'],
    ['7-ELEVEN #1234 OSLO S', '7-Eleven Oslo S'],
    ['H&M', 'H&M'],
    ['PAYPAL *SPOTIFY', 'Spotify'],
    ['Rema 1000', 'Rema 1000'],
    ['  Vinmonopolet   Majorstuen ', 'Vinmonopolet Majorstuen'],
    ['ØSTKANTEN BAKERI AS', 'Østkanten Bakeri'],
    ['STRAßE CAFÉ', 'STRAßE CAFÉ'],
    ['12345678', '12345678'],
    ['', 'Ukjent sted'],
  ])('%s → %s', (raw, clean) => {
    expect(cleanMerchant(raw)).toBe(clean);
  });

  it('kjenner igjen samme sted uansett skrivemåte', () => {
    expect(merchantKey('Rema 1000')).toBe('REMA1000');
    expect(merchantKey('REMA-1000')).toBe('REMA1000');
    expect(merchantKey('SUMUP *KAFE FUGLEN')).toBe('SUMUPKAFEFUGLEN');
    expect(merchantKey('Østkanten bakeri')).toBe('ØSTKANTENBAKERI');
    expect(merchantKey('Kafé Ø')).toBe('KAFÉØ');
  });
});

describe('kjøp', () => {
  it('tar inn et kjøp fra Apple Pay én gang, også etter at det er slettet', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', 'kr 149,00', 'REMA 1000 MAJORSTUEN'));
    expect(d.purchases).toHaveLength(1);
    expect(d.purchases[0]).toMatchObject({
      amount: 14900,
      currency: 'NOK',
      merchant: 'Rema 1000 Majorstuen',
      merchantKey: 'REMA1000MAJORSTUEN',
      day: TODAY,
      time: '14:32',
      parts: [],
      source: 'applepay',
    });
    expect(importPurchase(d, pay('a', 'kr 149,00', 'REMA 1000'))).toBe(d);
    d = deletePurchase(d, 'a');
    expect(importPurchase(d, pay('a', 'kr 149,00', 'REMA 1000'))).toBe(d);
  });

  it('tar inn et kjøp uten beløp, så det kan fylles inn', () => {
    const d = importPurchase(EMPTY_MONEY, pay('a', '', 'Kiwi'));
    expect(d.purchases[0].amount).toBe(0);
  });

  it('holder kjøpene sortert med nyeste først', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', '10', 'A', new Date(2026, 9, 25, 9, 0)));
    d = importPurchase(d, pay('b', '10', 'B', new Date(2026, 9, 26, 8, 0)));
    d = addPurchase(d, { ...manual, day: '2026-10-25', time: '12:00' }, 'c');
    expect(d.purchases.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    d = updatePurchase(d, 'a', { day: '2026-10-27' });
    expect(d.purchases.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('husker kategorien fra sist og foreslår den neste gang', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', '149', 'REMA 1000'));
    expect(suggestionFor(d, d.purchases[0])).toBeNull();
    d = categorize(d, 'a', 'dagligvarer');
    d = importPurchase(d, pay('b', '89', 'Rema 1000'));
    const b = d.purchases.find((p) => p.id === 'b')!;
    expect(suggestionFor(d, b)?.id).toBe('dagligvarer');
    d = categorize(d, 'b', 'hjem');
    d = importPurchase(d, pay('c', '20', 'REMA 1000'));
    expect(suggestionFor(d, d.purchases.find((p) => p.id === 'c')!)?.id).toBe('hjem');
  });

  it('foreslår ikke skjulte kategorier', () => {
    let d = categorize(importPurchase(EMPTY_MONEY, pay('a', '149', 'Kiwi')), 'a', 'shopping');
    d = importPurchase(d, pay('b', '10', 'Kiwi'));
    d = updateCategory(d, 'shopping', { hidden: true });
    expect(suggestionFor(d, d.purchases.find((p) => p.id === 'b')!)).toBeNull();
    expect(approveSuggestion(d, 'b')).toBe(d);
  });

  it('godkjenner alle forslag og lar nye steder vente', () => {
    let d = categorize(importPurchase(EMPTY_MONEY, pay('a', '10', 'Kiwi')), 'a', 'dagligvarer');
    d = importPurchase(d, pay('b', '20', 'Kiwi'));
    d = importPurchase(d, pay('c', '30', 'Nytt sted'));
    expect(pendingPurchases(d).map((p) => p.id).sort()).toEqual(['b', 'c']);
    d = approveAllSuggestions(d);
    expect(pendingPurchases(d).map((p) => p.id)).toEqual(['c']);
    expect(d.purchases.find((p) => p.id === 'b')!.parts).toEqual([{ categoryId: 'dagligvarer', amount: 2000 }]);
  });

  it('deler opp et kjøp bare når delene går opp', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', '600', 'Rema 1000'));
    const bad = updatePurchase(d, 'a', { parts: [{ categoryId: 'dagligvarer', amount: 45000 }, { categoryId: 'hjem', amount: 10000 }] });
    expect(bad).toBe(d);
    d = updatePurchase(d, 'a', { parts: [{ categoryId: 'dagligvarer', amount: 45000 }, { categoryId: 'hjem', amount: 15000 }] });
    expect(d.purchases[0].parts).toHaveLength(2);
    expect(d.merchants.REMA1000.categoryId).toBe('dagligvarer');
    expect(partsAreValid(100, [{ categoryId: 'x', amount: 0 }, { categoryId: 'y', amount: 100 }])).toBe(false);
  });

  it('lar én kategori følge med når beløpet endres', () => {
    let d = categorize(importPurchase(EMPTY_MONEY, pay('a', '149', 'Kiwi')), 'a', 'dagligvarer');
    d = updatePurchase(d, 'a', { amount: 20000 });
    expect(d.purchases[0].parts).toEqual([{ categoryId: 'dagligvarer', amount: 20000 }]);
  });

  it('et kjøp som ikke telles med, venter ikke', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', '149', 'Kiwi'));
    d = updatePurchase(d, 'a', { skipped: true });
    expect(pendingPurchases(d)).toEqual([]);
    expect(monthSummary(d, '2026-10')).toMatchObject({ total: 0, skipped: 1, count: 0 });
  });

  it('gir steder eget navn og tar det bort igjen', () => {
    let d = importPurchase(EMPTY_MONEY, pay('a', '149', 'SUMUP *KAFE FUGLEN'));
    d = renameMerchant(d, 'SUMUPKAFEFUGLEN', '  Fuglen  ');
    expect(merchantName(d, d.purchases[0])).toBe('Fuglen');
    d = renameMerchant(d, 'SUMUPKAFEFUGLEN', '');
    expect(merchantName(d, d.purchases[0])).toBe('Kafe Fuglen');
    expect(renameMerchant(d, '', 'x')).toBe(d);
  });

  it('legger inn kjøp for hånd og husker stedet', () => {
    const d = addPurchase(EMPTY_MONEY, manual, 'm');
    expect(d.purchases[0]).toMatchObject({ id: 'm', merchant: 'Vipps til Ola', source: 'manual', currency: 'NOK' });
    expect(d.merchants.VIPPSTILOLA).toEqual({ categoryId: 'fritid' });
    expect(addPurchase(EMPTY_MONEY, { ...manual, parts: [{ categoryId: 'fritid', amount: 1 }] })).toBe(EMPTY_MONEY);
  });

  it('viser når kjøpet var', () => {
    const d = importPurchase(EMPTY_MONEY, pay('a', '1', 'A', new Date(2026, 9, 25, 9, 5)));
    expect(purchaseWhen(d.purchases[0], TODAY)).toBe('I går 09:05');
    expect(purchaseWhen(d.purchases[0], '2026-10-30')).toBe('25. okt 09:05');
  });
});

describe('kategorier', () => {
  it('legger til, gir nytt navn og flytter', () => {
    let d: MoneyData = addCategory(EMPTY_MONEY, { name: ' Bil ', icon: 'car', color: 'himmel' }, 'bil');
    expect(d.categories.at(-1)).toEqual({ id: 'bil', name: 'Bil', icon: 'car', color: 'himmel', hidden: false });
    expect(addCategory(d, { name: ' ', icon: 'car', color: 'himmel' })).toBe(d);
    d = updateCategory(d, 'hjem', { name: 'Bolig' });
    expect(d.categories.find((c) => c.id === 'hjem')!.name).toBe('Bolig');
    expect(updateCategory(d, 'hjem', { name: '  ' })).toBe(d);
    d = moveCategory(d, 'transport', -1);
    expect(d.categories.slice(0, 3).map((c) => c.id)).toEqual(['dagligvarer', 'transport', 'spise-ute']);
    expect(moveCategory(d, 'dagligvarer', -1)).toBe(d);
  });
});

describe('summer', () => {
  function month(): MoneyData {
    let d = importPurchase(EMPTY_MONEY, pay('a', '600', 'Rema', new Date(2026, 9, 3, 10, 0)));
    d = updatePurchase(d, 'a', { parts: [{ categoryId: 'dagligvarer', amount: 45000 }, { categoryId: 'hjem', amount: 15000 }] });
    d = categorize(importPurchase(d, pay('b', '200', 'Kafe', new Date(2026, 9, 4, 10, 0))), 'b', 'spise-ute');
    d = importPurchase(d, pay('c', '100', 'Nytt', new Date(2026, 9, 5, 10, 0)));
    d = importPurchase(d, pay('d', '€12.50', 'Bar', new Date(2026, 9, 6, 10, 0)));
    d = updatePurchase(importPurchase(d, pay('e', '999', 'Jobb', new Date(2026, 9, 7, 10, 0))), 'e', { skipped: true });
    d = categorize(importPurchase(d, pay('f', '50', 'Kiwi', new Date(2026, 8, 30, 10, 0))), 'f', 'dagligvarer');
    return d;
  }

  it('summerer måneden per kategori, størst først', () => {
    expect(monthSummary(month(), '2026-10')).toEqual({
      month: '2026-10',
      total: 90000,
      pending: 10000,
      byCategory: [
        { categoryId: 'dagligvarer', amount: 45000 },
        { categoryId: 'spise-ute', amount: 20000 },
        { categoryId: 'hjem', amount: 15000 },
      ],
      other: { EUR: 1250 },
      count: 4,
      skipped: 1,
    });
  });

  it('gir de siste seks månedene, eldste først', () => {
    const months = recentMonths(month(), TODAY);
    expect(months.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(months[4].total).toBe(5000);
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthName('2025-12', TODAY)).toBe('desember 2025');
    expect(monthName('2026-10', TODAY)).toBe('oktober');
  });

  it('finner kjøp på kategori, måned og søk', () => {
    const d = month();
    expect(findPurchases(d, { categoryId: 'dagligvarer' }).map((p) => p.id)).toEqual(['a', 'f']);
    expect(findPurchases(d, { categoryId: 'dagligvarer', month: '2026-10' }).map((p) => p.id)).toEqual(['a']);
    expect(findPurchases(d, { query: 'kaf' }).map((p) => p.id)).toEqual(['b']);
  });
});

describe('oppsett til Swift', () => {
  it('sender bare kategorier som er i bruk, og steder med navn eller kategori', () => {
    let d = categorize(importPurchase(EMPTY_MONEY, pay('a', '1', 'Kiwi')), 'a', 'shopping');
    d = categorize(importPurchase(d, pay('b', '1', 'Rema')), 'b', 'dagligvarer');
    d = renameMerchant(d, 'KAFE', 'Kafeen');
    d = updateCategory(d, 'shopping', { hidden: true });
    const config = nativePurchaseConfig(d);
    expect(config.categories.dagligvarer).toBe('Dagligvarer');
    expect(config.categories.shopping).toBeUndefined();
    expect(config.merchants).toEqual({ REMA: { categoryId: 'dagligvarer' }, KAFE: { name: 'Kafeen' } });
  });
});

import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import { backupJson, createBackup, purchasesCsv, readBackup } from '../backup';
import { EMPTY_MONEY, merchantKey, purchaseWhen, UNKNOWN_PLACE } from '../money';
import { addPurchase, importPurchase } from '../moneyState';
import { applyPurchaseImport, parseCsv, readPurchasesCsv, type PurchaseImport } from '../purchaseImport';
import { loadData } from '../state';
import type { MoneyData, Purchase } from '../types';

afterEach(() => setLang('nb'));

const ids = () => {
  let n = 0;
  return () => `i${++n}`;
};

function sample(): MoneyData {
  let money: MoneyData = { ...EMPTY_MONEY, currency: 'NOK' };
  money = addPurchase(money, { amount: 14900, merchant: 'Rema 1000', day: '2026-11-03', time: '17:05', parts: [{ categoryId: 'dagligvarer', amount: 14900 }], skipped: false, note: '' }, 'p1');
  money = addPurchase(
    money,
    { amount: 50000, merchant: 'Vipps til Ola, «bursdag»', day: '2026-11-04', time: '09:30', parts: [{ categoryId: 'fritid', amount: 30000 }, { categoryId: 'spise-ute', amount: 20000 }], skipped: false, note: 'Gave, og middag' },
    'p2'
  );
  money = importPurchase(money, { id: 'ap1', amountText: '€12,50', merchant: '=HYPERLINK("x")', at: new Date(2026, 10, 4, 11, 0) });
  money = addPurchase(money, { amount: 9900, merchant: '', day: '2026-11-02', time: '08:00', parts: [], skipped: true, note: 'Utlegg' }, 'p3');
  return money;
}

/** Det som skal være likt etter eksport og import: alt unntatt ID og kilde. */
const content = (p: Purchase) => ({ amount: p.amount, currency: p.currency, merchant: p.merchant, merchantKey: p.merchantKey, day: p.day, time: p.time, parts: p.parts, skipped: p.skipped, note: p.note });

function plan(text: string, money: MoneyData = { ...EMPTY_MONEY, currency: 'NOK' }): PurchaseImport {
  const res = readPurchasesCsv(text, money, ids());
  if (!res.ok) throw new Error(res.error);
  return res.plan;
}

const HEADER = 'Dato,Tid,Sted,Beløp,Valuta,Kategori,Notat,Telles ikke';

describe('CSV', () => {
  it('leser felt i anførselstegn, doble anførselstegn og linjeskift i felt', () => {
    expect(parseCsv('﻿a,"b, c","d ""e"""\r\n"f\ng",h,\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['f\ng', 'h', ''],
    ]);
  });

  it('finner skilletegnet i overskriften', () => {
    expect(parseCsv('Dato;Beløp\n2026-10-26;5,00')).toEqual([
      ['Dato', 'Beløp'],
      ['2026-10-26', '5,00'],
    ]);
    expect(parseCsv('Dato\tBeløp\n2026-10-26\t5')).toEqual([
      ['Dato', 'Beløp'],
      ['2026-10-26', '5'],
    ]);
  });
});

describe('import av kjøp', () => {
  it('gir de samme kjøpene tilbake etter eksport som CSV', () => {
    const money = sample();
    const p = plan(purchasesCsv(money));
    expect(p.purchases.map(content)).toEqual(money.purchases.map(content));
    expect(p).toMatchObject({ duplicates: 0, pending: 1, unknownCategories: [], badRows: [], first: '2026-11-02', last: '2026-11-04' });
    // Kjøpet med ukjent sted og formelen i stedsnavnet kommer tilbake som de var.
    expect(p.purchases.find((x) => x.note === 'Utlegg')?.merchant).toBe(UNKNOWN_PLACE);
    expect(p.purchases.find((x) => x.currency === 'EUR')?.merchant).toBe('=HYPERLINK("x")');
  });

  it('leser en eksport på engelsk inn i data på norsk', () => {
    setLang('en');
    const csv = purchasesCsv(sample());
    setLang('nb');
    expect(plan(csv).purchases.map(content)).toEqual(sample().purchases.map(content));
  });

  it('hopper over kjøp som allerede er i Vane, så samme fil kan importeres to ganger', () => {
    const money = sample();
    const p = plan(purchasesCsv(money), money);
    expect(p.purchases).toEqual([]);
    expect(p.duplicates).toBe(4);
  });

  it('beholder to like kjøp i filen, men tar dem ikke inn igjen', () => {
    const csv = [HEADER, '2026-10-26,,Voi,22.50,NOK,Transport,,', '2026-10-26,,Voi,22.50,NOK,Transport,,'].join('\n');
    const first = plan(csv);
    expect(first.purchases).toHaveLength(2);
    const money = applyPurchaseImport({ ...EMPTY_MONEY, currency: 'NOK' }, first);
    expect(plan(csv, money)).toMatchObject({ purchases: [], duplicates: 2 });
  });

  it('leser semikolon, desimalkomma, norsk dato og kjøp uten tid', () => {
    const csv = ['Dato;Tid;Sted;Beløp;Valuta;Kategori;Notat;Telles ikke', '26.10.2026;;Voi;5,00;NOK;Transport;;', '1.10.2026;15.29;TrumfPay;1 553,56;;Dagligvarer;Hyttetur;'].join('\r\n');
    const p = plan(csv);
    expect(p.purchases.map((x) => [x.day, x.time, x.merchant, x.amount, x.currency, x.parts])).toEqual([
      ['2026-10-26', '', 'Voi', 500, 'NOK', [{ categoryId: 'transport', amount: 500 }]],
      ['2026-10-01', '15:29', 'TrumfPay', 155356, 'NOK', [{ categoryId: 'dagligvarer', amount: 155356 }]],
    ]);
    expect(purchaseWhen(p.purchases[0], '2026-11-09')).toBe('26. okt');
  });

  it('setter sammen rader for samme kjøp med ulik kategori, men ikke like kjøp', () => {
    const csv = [
      HEADER,
      '2026-10-01,15:29,TrumfPay,184.52,NOK,Dagligvarer,Hyttetur,',
      '2026-10-01,15:29,TrumfPay,369.04,NOK,Utlegg,Hyttetur,',
      '2026-10-01,,Voi,10.00,NOK,Transport,,',
      '2026-10-01,,Voi,10.00,NOK,Transport,,',
    ].join('\n');
    const money: MoneyData = { ...EMPTY_MONEY, currency: 'NOK', categories: [...EMPTY_MONEY.categories, { id: 'u', name: 'Utlegg', icon: 'tag', color: 'himmel', hidden: false }] };
    const p = plan(csv, money);
    expect(p.purchases.map((x) => [x.merchant, x.amount, x.parts.length])).toEqual([
      ['TrumfPay', 55356, 2],
      ['Voi', 1000, 1],
      ['Voi', 1000, 1],
    ]);
  });

  it('legger kjøp med ukjent eller tom kategori under Venter og sier hvilke kategorier som mangler', () => {
    const csv = [HEADER, '2026-10-01,,Platinum Tekna,8300.00,NOK,Kredittkort,,', '2026-10-02,,Kiosk,20.00,NOK,,,', '2026-10-03,,Apple,39.00,NOK,Fritid,,ja'].join('\n');
    const p = plan(csv);
    expect(p.pending).toBe(2);
    expect(p.unknownCategories).toEqual(['Kredittkort']);
    expect(p.purchases.find((x) => x.merchant === 'Apple')).toMatchObject({ skipped: true, parts: [{ categoryId: 'fritid', amount: 3900 }] });
  });

  it('hopper over rader som ikke kan leses, og sier hvilke', () => {
    const csv = [HEADER, '2026-02-30,,A,5.00,NOK,,,', '2026-10-01,25:00,B,5.00,NOK,,,', '2026-10-01,,C,-5.00,NOK,,,', '2026-10-01,,D,,NOK,,,', '2026-10-01,,E,5.00,kr,,,', '2026-10-01,,F,5.00,NOK,,,'].join('\n');
    const p = plan(csv);
    expect(p.badRows).toEqual([2, 3, 4, 5, 6]);
    expect(p.purchases.map((x) => x.merchant)).toEqual(['F']);
  });

  it('avviser en fil uten kjøp eller uten kolonnene for dato og beløp', () => {
    const money = { ...EMPTY_MONEY };
    expect(readPurchasesCsv('', money)).toEqual({ ok: false, error: 'empty' });
    expect(readPurchasesCsv(`${HEADER}\n\n`, money)).toEqual({ ok: false, error: 'empty' });
    expect(readPurchasesCsv('Sted,Beløp\nRema,5', money)).toEqual({ ok: false, error: 'columns' });
    expect(readPurchasesCsv('{"app":"vane"}', money)).toEqual({ ok: false, error: 'columns' });
  });

  it('kobler kjøp til steder som allerede er i Vane, også med eget navn', () => {
    let money = sample();
    money = { ...money, merchants: { ...money.merchants, REMA1000: { categoryId: 'dagligvarer', name: 'Rema hjemme' } } };
    const p = plan([HEADER, '2026-10-01,,Rema hjemme,10.00,NOK,Dagligvarer,,', '2026-10-01,,Vipps til Ola  «bursdag»,10.00,NOK,Fritid,,'].join('\n'), money);
    // Et navn Vane ikke har, får nøkkelen fra navnet, og den er lik for samme sted skrevet litt annerledes.
    expect(p.purchases.map((x) => x.merchantKey)).toEqual(['REMA1000', merchantKey('Vipps til Ola, «bursdag»')]);
  });

  it('lærer kategorien bare for steder Vane ikke kjenner fra før', () => {
    const money = sample();
    const p = plan([HEADER, '2026-10-01,,Rema 1000,10.00,NOK,Annet,,', '2026-10-01,,Kiwi,10.00,NOK,Dagligvarer,,'].join('\n'), money);
    const next = applyPurchaseImport(money, p);
    expect(next.merchants.REMA1000.categoryId).toBe('dagligvarer');
    expect(next.merchants.KIWI.categoryId).toBe('dagligvarer');
  });

  it('legger kjøpene inn nyeste først uten å endre dem som er der', () => {
    const money = sample();
    const p = plan([HEADER, '2026-11-03,,Kiwi,10.00,NOK,Dagligvarer,,', '2026-11-05,12:00,Kiwi,20.00,NOK,Dagligvarer,,'].join('\n'), money);
    const next = applyPurchaseImport(money, p);
    expect(next.purchases.map((x) => x.id)).toEqual(['i2', 'ap1', 'p2', 'p1', 'i1', 'p3']);
    // Samme plan to ganger legger ikke til noe nytt.
    expect(applyPurchaseImport(next, p).purchases).toHaveLength(6);
  });

  it('kan tas med i en sikkerhetskopi', () => {
    const money = applyPurchaseImport(sample(), plan([HEADER, '2026-10-01,,Voi,5.00,NOK,Transport,,'].join('\n')));
    const res = readBackup(backupJson(createBackup(loadData(undefined), money, new Date())));
    expect(res.ok).toBe(true);
  });
});

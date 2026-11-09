import { afterEach, describe, expect, it } from '@jest/globals';

import { setLang } from '@/i18n';

import { backupJson, BACKUP_VERSION, createBackup, MAX_FILE_BYTES, purchasesCsv, readBackup, restoreBackup, summarizeBackup } from '../backup';
import { valueOn } from '../habits';
import { EMPTY_MONEY } from '../money';
import { addPurchase, importPurchase } from '../moneyState';
import { addRecurring, dismissSuggestion } from '../recurring';
import { addGoal, addHabit, loadData, setValue } from '../state';
import { EMPTY_DATA, type Data, type MoneyData } from '../types';

afterEach(() => setLang('nb'));

const NOW = new Date('2026-11-04T12:00:00Z');

function sample(): { data: Data; money: MoneyData } {
  let data = loadData(undefined);
  data = addHabit(data, { name: 'Gå en tur', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: '18:00' }, '2026-08-01', 'h1');
  data = addHabit(data, { name: 'Vann', color: 'himmel', type: 'count', target: 8, unit: 'glass', schedule: { kind: 'days', days: [true, false, true, false, true, false, false] }, reminder: null }, '2026-08-01', 'h2');
  data = setValue(data, 'h1', '2026-11-03', 1);
  data = setValue(data, 'h2', '2026-11-03', 5);
  data = setValue(data, 'h2', '2026-11-04', 2);
  data = addGoal(data, '2026-11-04', 'Ringe bestemor', 'g1');
  data = { ...data, settings: { ...data.settings, weekStart: 'sun', onboarded: true } };
  let money: MoneyData = { ...EMPTY_MONEY, currency: 'NOK' };
  money = addPurchase(money, { amount: 14900, merchant: 'Rema 1000', day: '2026-11-03', time: '17:05', parts: [{ categoryId: 'dagligvarer', amount: 14900 }], skipped: false, note: '' }, 'p1');
  money = addPurchase(
    money,
    { amount: 50000, merchant: 'Vipps til Ola, «bursdag»', day: '2026-11-04', time: '09:30', parts: [{ categoryId: 'fritid', amount: 30000 }, { categoryId: 'spise-ute', amount: 20000 }], skipped: false, note: 'Gave, og middag' },
    'p2'
  );
  money = importPurchase(money, { id: 'ap1', amountText: '€12,50', merchant: '=HYPERLINK("x")', at: new Date(2026, 10, 4, 11, 0) });
  money = addPurchase(money, { amount: 9900, merchant: '', day: '2026-11-02', time: '08:00', parts: [], skipped: true, note: 'Utlegg' }, 'p3');
  money = addRecurring(money, { name: 'Husleie', amount: 950000, frequency: 'month', anchor: '2026-11-01', categoryId: 'hjem', note: '', remind: true }, 'r1');
  money = dismissSuggestion(money, 'KIWI');
  return { data, money };
}

describe('sikkerhetskopi', () => {
  it('gir de samme dataene tilbake etter eksport og import', () => {
    const { data, money } = sample();
    const res = readBackup(backupJson(createBackup(data, money, NOW)));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backup.data).toEqual(data);
    expect(res.backup.money).toEqual(money);
    expect(res.backup.version).toBe(BACKUP_VERSION);
    expect(res.backup.exportedAt).toBe('2026-11-04T12:00:00.000Z');
  });

  it('oppsummerer hva filen inneholder', () => {
    const { data, money } = sample();
    expect(summarizeBackup(createBackup(data, money, NOW))).toEqual({ habits: 2, days: 2, goals: 1, journal: 0, purchases: 4, recurring: 1, exportedAt: NOW });
  });

  it('avviser filer som ikke er JSON, ikke er fra Vane, eller er fra en nyere versjon', () => {
    expect(readBackup('ikke json')).toEqual({ ok: false, error: 'notJson' });
    expect(readBackup('')).toEqual({ ok: false, error: 'notJson' });
    expect(readBackup('[]')).toEqual({ ok: false, error: 'notVane' });
    expect(readBackup(JSON.stringify({ app: 'noe annet', version: 1, data: {}, money: {} }))).toEqual({ ok: false, error: 'notVane' });
    expect(readBackup(JSON.stringify({ app: 'vane', version: '1', data: {}, money: {} }))).toEqual({ ok: false, error: 'notVane' });
    expect(readBackup(JSON.stringify({ app: 'vane', version: BACKUP_VERSION + 1, data: {}, money: {} }))).toEqual({ ok: false, error: 'newer' });
  });

  it('avviser en skadet fil i stedet for å ta inn deler av den', () => {
    const { data, money } = sample();
    const good = createBackup(data, money, NOW);
    const broken = [
      { ...good, data: null },
      { ...good, money: 'x' },
      { ...good, data: { ...data, habits: [{ ...data.habits[0], schedule: { kind: 'hver dag' } }] } },
      { ...good, data: { ...data, habits: [{ ...data.habits[0], color: 'rød' }] } },
      { ...good, data: { ...data, logs: { '2026-11-03': { h1: 'ja' } } } },
      { ...good, data: { ...data, logs: { 'i går': { h1: 1 } } } },
      { ...good, data: { ...data, settings: { ...data.settings, morningTime: '7' } } },
      { ...good, money: { ...money, purchases: [{ ...money.purchases[0], amount: -5 }] } },
      { ...good, money: { ...money, purchases: [{ ...money.purchases[0], amount: 1.5 }] } },
      { ...good, money: { ...money, purchases: [{ ...money.purchases[0], currency: 'kroner' }] } },
      { ...good, money: { ...money, purchases: [{ ...money.purchases[0], parts: [{ categoryId: 'x' }] }] } },
      { ...good, money: { ...money, categories: [{ id: 'x', name: 'X', icon: 'tag', color: 'lilla', hidden: false }] } },
      { ...good, money: { ...money, recurring: [{ ...money.recurring[0], amount: 0 }] } },
      { ...good, money: { ...money, recurring: [{ ...money.recurring[0], name: '  ' }] } },
      { ...good, money: { ...money, recurring: [{ ...money.recurring[0], frequency: 'kvartal' }] } },
      { ...good, money: { ...money, recurring: [{ ...money.recurring[0], anchor: '2026-02-30' }] } },
      { ...good, money: { ...money, recurring: [{ ...money.recurring[0], categoryId: undefined }] } },
      { ...good, money: { ...money, recurring: [money.recurring[0], money.recurring[0]] } },
      { ...good, money: { ...money, recurring: { r1: money.recurring[0] } } },
      { ...good, money: { ...money, recurringDismissed: ['__proto__'] } },
    ];
    for (const file of broken) expect(readBackup(JSON.stringify(file))).toEqual({ ok: false, error: 'damaged' });
  });

  it('avviser en fil som mangler vanene, loggene, målene, innstillingene, kjøpene eller kategoriene', () => {
    expect(readBackup(JSON.stringify({ app: 'vane', version: 1, data: {}, money: {} }))).toEqual({ ok: false, error: 'damaged' });
    const { data, money } = sample();
    const good = createBackup(data, money, NOW);
    for (const key of ['habits', 'logs', 'goals', 'settings'] as const) {
      const { [key]: _gone, ...rest } = data;
      expect(readBackup(JSON.stringify({ ...good, data: rest }))).toEqual({ ok: false, error: 'damaged' });
    }
    for (const key of ['purchases', 'categories'] as const) {
      const { [key]: _gone, ...rest } = money;
      expect(readBackup(JSON.stringify({ ...good, money: rest }))).toEqual({ ok: false, error: 'damaged' });
    }
  });

  it('avviser ID-er og nøkler som ville gitt noe annet enn en verdi når appen slår dem opp', () => {
    const { data, money } = sample();
    const good = createBackup(data, money, NOW);
    const h = data.habits[0];
    // JSON.parse lager «__proto__» som et vanlig felt, slik en laget fil ville gjort.
    const files = [
      `{"app":"vane","version":1,"data":${JSON.stringify({ ...data, habits: [{ ...h, id: 'XX' }] }).replace('"XX"', '"__proto__"')},"money":${JSON.stringify(money)}}`,
      JSON.stringify({ ...good, data: { ...data, habits: [{ ...h, id: 'constructor' }] } }),
      JSON.stringify({ ...good, data: { ...data, logs: { '2026-11-03': { toString: 1 } } } }),
      JSON.stringify({ ...good, money: { ...money, merchants: { constructor: { name: 'X' } } } }),
      JSON.stringify({ ...good, money: { ...money, purchases: [{ ...money.purchases[0], merchantKey: 'hasOwnProperty' }] } }),
      JSON.stringify({ ...good, data: { ...data, habits: [h, { ...h }] } }),
      JSON.stringify({ ...good, money: { ...money, purchases: [money.purchases[0], money.purchases[0]] } }),
    ];
    for (const text of files) expect(readBackup(text)).toEqual({ ok: false, error: 'damaged' });
  });

  it('avviser klokkeslett og dager som ikke finnes, og deler som ikke er hele beløpet', () => {
    const { data, money } = sample();
    const good = createBackup(data, money, NOW);
    const p = money.purchases[0];
    const broken = [
      { ...good, data: { ...data, settings: { ...data.settings, morningTime: '25:00' } } },
      { ...good, data: { ...data, habits: [{ ...data.habits[0], reminder: '18:60' }] } },
      { ...good, data: { ...data, logs: { '2026-02-30': { h1: 1 } } } },
      { ...good, money: { ...money, purchases: [{ ...p, time: '24:00' }] } },
      { ...good, money: { ...money, purchases: [{ ...p, day: '2026-13-01' }] } },
      { ...good, money: { ...money, purchases: [{ ...p, parts: [{ categoryId: 'fritid', amount: 100 }] }] } },
    ];
    for (const file of broken) expect(readBackup(JSON.stringify(file))).toEqual({ ok: false, error: 'damaged' });
  });

  it('avviser en fil som er større enn noen eksport', () => {
    expect(readBackup(' '.repeat(MAX_FILE_BYTES + 1))).toEqual({ ok: false, error: 'tooBig' });
  });

  it('fyller inn felt som kom senere, som når appen leser sine egne data', () => {
    const old = {
      app: 'vane',
      version: 1,
      exportedAt: '2026-10-01T08:00:00.000Z',
      data: { habits: [], logs: { '2026-09-30': { h1: 1 } }, goals: {}, settings: { morningEnabled: true, morningTime: '07:00', remindersEnabled: true } },
      money: { purchases: [], categories: EMPTY_MONEY.categories },
    };
    const res = readBackup(JSON.stringify(old));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backup.data.goalsSkipped).toEqual({});
    expect(res.backup.data.settings.modules.money).toBe(true);
    expect(res.backup.data.settings.onboarded).toBe(true);
    expect(res.backup.money.categories.length).toBeGreaterThan(0);
    // Kjøp fra før hovedvalutaen fantes, var i kroner.
    expect(res.backup.money.currency).toBe('NOK');
    // Faste utgifter kom senere.
    expect(res.backup.money.recurring).toEqual([]);
    expect(res.backup.money.recurringDismissed).toEqual([]);
  });

  it('tar ikke inn et kjøp fra Snarveier på nytt etter import', () => {
    const { data, money } = sample();
    const onPhone = importPurchase(EMPTY_MONEY, { id: 'ap-ny', amountText: '10', merchant: 'Kiosk', at: NOW });
    const restored = restoreBackup(createBackup(data, money, NOW), onPhone);
    expect(restored.money.imported).toEqual(['ap1', 'ap-ny']);
    expect(restored.money.purchases).toEqual(money.purchases);
    expect(restored.data).toEqual(data);
  });
});

describe('kjøp som CSV', () => {
  it('har én rad per del, og trygge felt', () => {
    const { money } = sample();
    const lines = purchasesCsv(money).split('\r\n');
    expect(lines).toEqual([
      '\uFEFFDato,Tid,Sted,Beløp,Valuta,Kategori,Notat,Telles ikke',
      '2026-11-04,11:00,"\'=HYPERLINK(""x"")",12.50,EUR,,,',
      '2026-11-04,09:30,"Vipps til Ola, «bursdag»",300.00,NOK,Fritid,"Gave, og middag",',
      '2026-11-04,09:30,"Vipps til Ola, «bursdag»",200.00,NOK,Spise ute,"Gave, og middag",',
      '2026-11-03,17:05,Rema 1000,149.00,NOK,Dagligvarer,,',
      '2026-11-02,08:00,Ukjent sted,99.00,NOK,,Utlegg,ja',
      '',
    ]);
  });

  it('bruker telefonens språk for overskrifter og standardkategorier', () => {
    setLang('en');
    const lines = purchasesCsv(sample().money).split('\r\n');
    expect(lines[0]).toBe('\uFEFFDate,Time,Place,Amount,Currency,Category,Note,Not counted');
    expect(lines[4]).toBe('2026-11-03,17:05,Rema 1000,149.00,NOK,Groceries,,');
    expect(lines[5]).toBe('2026-11-02,08:00,Unknown place,99.00,NOK,,Utlegg,yes');
  });

  it('er bare overskriften uten kjøp', () => {
    expect(purchasesCsv(EMPTY_MONEY)).toBe('\uFEFFDato,Tid,Sted,Beløp,Valuta,Kategori,Notat,Telles ikke\r\n');
    expect(EMPTY_DATA.habits).toEqual([]);
  });

  it('gjør formler ufarlige også etter semikolon og mellomrom', () => {
    let money: MoneyData = { ...EMPTY_MONEY, currency: 'NOK' };
    const add = (merchant: string, note: string, id: string) =>
      addPurchase(money, { amount: 100, merchant, day: '2026-11-04', time: '12:00', parts: [], skipped: false, note }, id);
    money = add('Kafe;=HYPERLINK("x")', ' =1+1', 'a');
    money = add('-5 kr rabatt', 'a;@SUM(1)', 'b');
    money = add('Bad- og kjøkken', 'e-post', 'c');
    // Notatet lagres trimmet når det skrives inn, men en fil kan ha mellomrom først.
    money = { ...money, purchases: money.purchases.map((p) => (p.id === 'a' ? { ...p, note: ' =1+1' } : p)) };
    const rows = purchasesCsv(money).split('\r\n').slice(1, 4);
    expect(rows).toEqual([
      '2026-11-04,12:00,Bad- og kjøkken,1.00,NOK,,e-post,',
      `2026-11-04,12:00,'-5 kr rabatt,1.00,NOK,,"a;'@SUM(1)",`,
      `2026-11-04,12:00,"Kafe;'=HYPERLINK(""x"")",1.00,NOK,, '=1+1,`,
    ]);
  });
});

describe('verdien for en vane en dag', () => {
  it('er et tall også for nøkler som finnes på alle objekter', () => {
    expect(valueOn({ logs: { '2026-11-04': {} } }, '__proto__', '2026-11-04')).toBe(0);
    expect(valueOn({ logs: { '2026-11-04': {} } }, 'constructor', '2026-11-04')).toBe(0);
  });
});

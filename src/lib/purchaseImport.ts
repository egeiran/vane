import { stringsFor } from '@/i18n';

import { MAX_FILE_BYTES, MAX_PURCHASES } from './backup';
import type { DateKey } from './dates';
import { categoryName, isPending, mainCurrency, merchantKey, parseAmount, UNKNOWN_PLACE } from './money';
import { partsAreValid } from './moneyState';
import { newId } from './state';
import type { MoneyData, Purchase, PurchasePart } from './types';

/**
 * Kjøp fra en CSV-fil, for eksempel fra banken, gjort om til samme kolonner som «Eksporter kjøp som
 * CSV»: dato, tid, sted, beløp, valuta, kategori, notat og «telles ikke», med overskrifter på norsk
 * eller engelsk. Ren logikk. Filen velges i `backupFiles.ts`.
 *
 * Importen legger til og erstatter aldri noe. Et kjøp som allerede finnes (samme dag, tid, beløp,
 * valuta og sted), hoppes over, så samme fil kan importeres to ganger. To like kjøp i filen blir to
 * kjøp. Tid kan mangle: da får kjøpet ingen tid og vises bare med dato.
 *
 * Et oppdelt kjøp står som flere rader rett etter hverandre med samme dag, tid, sted, valuta, notat
 * og «telles ikke», men ulik kategori, slik eksporten skriver det. En kategori som ikke finnes, gir
 * et kjøp uten kategori (under Venter), og navnet vises før noe legges til.
 */

export type CsvImportError = 'empty' | 'columns' | 'tooBig' | 'tooMany';

export type PurchaseImport = {
  /** De nye kjøpene, nyeste først. */
  purchases: Purchase[];
  /** Kjøp i filen som allerede er i Vane. */
  duplicates: number;
  /** Nye kjøp uten kategori, som havner under Venter. */
  pending: number;
  /** Kategorier i filen som ikke finnes i Vane. */
  unknownCategories: string[];
  /** Radnumrene (overskriften er rad 1) som ikke kunne leses. */
  badRows: number[];
  first: DateKey | null;
  last: DateKey | null;
};

export type CsvImportResult = { ok: true; plan: PurchaseImport } | { ok: false; error: CsvImportError };

type Column = 'date' | 'time' | 'place' | 'amount' | 'currency' | 'category' | 'note' | 'notCounted';
const COLUMNS: Column[] = ['date', 'time', 'place', 'amount', 'currency', 'category', 'note', 'notCounted'];

const norm = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

/** Overskriftene på begge språk. */
function headerNames(): Map<string, Column> {
  const names = new Map<string, Column>();
  for (const lang of ['nb', 'en'] as const) {
    const h = stringsFor(lang).backup.csv;
    for (const c of COLUMNS) names.set(norm(h[c]), c);
  }
  return names;
}

/** Teksten i en celle, uten apostrofen eksporten setter foran =, +, - og @ (se `csvField` i backup.ts). */
const unguard = (s: string) => s.replace(/(^|[;\t\r\n])(\s*)'(?=[=+\-@])/g, '$1$2');

/** Leser CSV med komma, semikolon eller tabulator, felt i anførselstegn og linjeskift i felt. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  // Skilletegnet er det som deler overskriften i flest felt.
  const end = s.search(/[\r\n]/);
  const firstLine = (end < 0 ? s : s.slice(0, end)).replace(/"[^"]*"/g, '');
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const);
  const delimiter = counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** «2026-10-26» eller «26.10.2026», og bare en dag som finnes. */
function readDay(v: string): DateKey | null {
  const s = v.trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const nor = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const [y, m, d] = iso ? [+iso[1], +iso[2], +iso[3]] : nor ? [+nor[3], +nor[2], +nor[1]] : [0, 0, 0];
  if (!y) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** «18:05», «8:05» eller «18.05». Tom betyr ingen tid. `null` er en tid som ikke finnes. */
function readTime(v: string): string | null {
  const s = v.trim();
  if (!s) return '';
  const t = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (!t || +t[1] > 23 || +t[2] > 59) return null;
  return `${t[1].padStart(2, '0')}:${t[2]}`;
}

/** Et beløp over eller lik 0 i hundredeler. Et minustegn (refusjon) kan ikke leses. */
function readAmount(v: string, main: string): { amount: number; currency: string } | null {
  if (!/\d/.test(v) || /[-−]/.test(v)) return null;
  const parsed = parseAmount(v, main);
  return parsed && Number.isSafeInteger(parsed.amount) ? parsed : null;
}

const YES = new Set(['ja', 'yes', 'x', 'true', '1']);

/** Kategorinavn i filen (på norsk eller engelsk) til kategoriens ID. */
function categoryIds(money: MoneyData): Map<string, string> {
  const ids = new Map<string, string>();
  const add = (name: string | undefined, id: string) => {
    if (name && !ids.has(norm(name))) ids.set(norm(name), id);
  };
  for (const c of money.categories) add(c.name, c.id);
  for (const c of money.categories) {
    add(categoryName(c), c.id);
    // En standardkategori som ikke har fått nytt navn, heter det samme på begge språk.
    if (stringsFor('nb').defaultCategories[c.id] === c.name) add(stringsFor('en').defaultCategories[c.id], c.id);
  }
  return ids;
}

/** Steder som allerede er i Vane, etter navnet de vises med, så et kjøp fra filen kobles til dem. */
function knownPlaces(money: MoneyData): Map<string, string> {
  const keys = new Map<string, string>();
  for (const [key, m] of Object.entries(money.merchants)) if (m.name) keys.set(norm(m.name), key);
  for (const p of money.purchases) {
    if (p.merchantKey && !keys.has(norm(p.merchant))) keys.set(norm(p.merchant), p.merchantKey);
  }
  return keys;
}

const signature = (p: Pick<Purchase, 'day' | 'time' | 'amount' | 'currency' | 'merchantKey'>) => `${p.day}|${p.time}|${p.amount}|${p.currency}|${p.merchantKey}`;

type Row = { line: number; day: DateKey; time: string; place: string; amount: number; currency: string; categoryId: string | null; note: string; skipped: boolean };

/**
 * Leser filen og finner ut hva som legges til. Ingenting endres før `applyPurchaseImport`.
 * `makeId` gir ID-en til hvert nye kjøp.
 */
export function readPurchasesCsv(text: string, money: MoneyData, makeId: () => string = () => newId('p')): CsvImportResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: 'tooBig' };
  const all = parseCsv(text);
  const headerAt = all.findIndex((r) => r.some((f) => f.trim()));
  if (headerAt < 0) return { ok: false, error: 'empty' };
  const names = headerNames();
  const col: Partial<Record<Column, number>> = {};
  all[headerAt].forEach((h, i) => {
    const c = names.get(norm(h));
    if (c && col[c] === undefined) col[c] = i;
  });
  if (col.date === undefined || col.amount === undefined) return { ok: false, error: 'columns' };

  const main = mainCurrency(money);
  const categories = categoryIds(money);
  const deleted = new Set((['nb', 'en'] as const).map((l) => norm(stringsFor(l).money.deletedCategory)));
  const unknownPlace = new Set((['nb', 'en'] as const).map((l) => norm(stringsFor(l).money.unknownPlace)));
  const unknownCategories = new Set<string>();
  const badRows: number[] = [];
  const rows: Row[] = [];

  for (let r = headerAt + 1; r < all.length; r++) {
    const cells = all[r];
    if (!cells.some((f) => f.trim())) continue;
    const cell = (c: Column) => (col[c] === undefined ? '' : unguard(cells[col[c]!] ?? '').trim());
    const line = r + 1;
    const day = readDay(cell('date'));
    const time = readTime(cell('time'));
    const amount = readAmount(cell('amount'), main);
    const code = cell('currency').toUpperCase();
    if (!day || time === null || !amount || (code && !/^[A-Z]{3}$/.test(code))) {
      badRows.push(line);
      continue;
    }
    const category = cell('category');
    let categoryId: string | null = null;
    if (category && !deleted.has(norm(category))) {
      categoryId = categories.get(norm(category)) ?? null;
      if (!categoryId) unknownCategories.add(category);
    }
    const place = cell('place').replace(/\s+/g, ' ');
    rows.push({
      line,
      day,
      time,
      place: unknownPlace.has(norm(place)) ? '' : place,
      amount: amount.amount,
      currency: code || amount.currency,
      categoryId,
      note: cell('note').slice(0, 2000),
      skipped: YES.has(norm(cell('notCounted'))),
    });
  }

  // Rader rett etter hverandre som er deler av samme kjøp.
  const groups: Row[][] = [];
  for (const row of rows) {
    const g = groups[groups.length - 1];
    const head = g?.[0];
    const samePurchase =
      head &&
      row.categoryId &&
      head.categoryId &&
      !g.some((x) => x.categoryId === row.categoryId) &&
      (['day', 'time', 'place', 'currency', 'note', 'skipped'] as const).every((k) => head[k] === row[k]);
    if (samePurchase) g.push(row);
    else groups.push([row]);
  }

  const places = knownPlaces(money);
  const existing = new Map<string, number>();
  for (const p of money.purchases) existing.set(signature(p), (existing.get(signature(p)) ?? 0) + 1);

  const purchases: Purchase[] = [];
  let duplicates = 0;
  for (const g of groups) {
    const head = g[0];
    const amount = g.reduce((sum, x) => sum + x.amount, 0);
    const parts: PurchasePart[] = head.categoryId ? g.map((x) => ({ categoryId: x.categoryId!, amount: x.amount })) : [];
    if (!partsAreValid(amount, parts)) {
      badRows.push(...g.map((x) => x.line));
      continue;
    }
    const key = head.place ? (places.get(norm(head.place)) ?? merchantKey(head.place)) : '';
    const purchase: Purchase = {
      id: '',
      amount,
      currency: head.currency,
      merchant: head.place || UNKNOWN_PLACE,
      merchantKey: key,
      day: head.day,
      time: head.time,
      parts,
      skipped: head.skipped,
      note: head.note,
      source: 'manual',
    };
    const seen = existing.get(signature(purchase)) ?? 0;
    if (seen > 0) {
      existing.set(signature(purchase), seen - 1);
      duplicates++;
      continue;
    }
    purchases.push({ ...purchase, id: makeId() });
  }

  if (money.purchases.length + purchases.length > MAX_PURCHASES) return { ok: false, error: 'tooMany' };
  if (!purchases.length && !duplicates && !badRows.length) return { ok: false, error: 'empty' };

  purchases.sort(newestFirst);
  const days = purchases.map((p) => p.day).sort();
  return {
    ok: true,
    plan: {
      purchases,
      duplicates,
      pending: purchases.filter(isPending).length,
      unknownCategories: [...unknownCategories],
      badRows: badRows.sort((a, b) => a - b),
      first: days[0] ?? null,
      last: days[days.length - 1] ?? null,
    },
  };
}

/** Nyeste først, som kjøpene ligger i Vane. Et kjøp uten tid havner etter de med tid samme dag. */
const newestFirst = (a: Purchase, b: Purchase) => {
  const ka = `${a.day} ${a.time}`;
  const kb = `${b.day} ${b.time}`;
  return ka < kb ? 1 : ka > kb ? -1 : 0;
};

/**
 * Legger de nye kjøpene til. Stedene i filen lærer Vane kategorien for bare hvis Vane ikke kjenner
 * dem fra før, så gamle kjøp ikke endrer forslagene for steder man bruker nå.
 */
export function applyPurchaseImport(money: MoneyData, plan: PurchaseImport): MoneyData {
  const ids = new Set(money.purchases.map((p) => p.id));
  const added = plan.purchases.filter((p) => !ids.has(p.id));
  const merchants = { ...money.merchants };
  for (const p of added) {
    if (!p.merchantKey || !p.parts.length || merchants[p.merchantKey]?.categoryId) continue;
    const biggest = p.parts.reduce((a, b) => (b.amount > a.amount ? b : a));
    merchants[p.merchantKey] = { ...merchants[p.merchantKey], categoryId: biggest.categoryId };
  }
  // Stabil sortering: de som var der, kommer før nye kjøp med samme tidspunkt.
  return { ...money, purchases: [...money.purchases, ...added].sort(newestFirst), merchants };
}

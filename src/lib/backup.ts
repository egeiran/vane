import { tr } from '@/i18n';

import { isMood, MAX_JOURNAL_TEXT } from './journal';
import { categoryById, categoryName, merchantName } from './money';
import { loadMoney, MAX_IMPORTED, partsAreValid } from './moneyState';
import { FREQUENCIES, MAX_DISMISSED } from './recurring';
import { loadData } from './state';
import type { Data, MoneyData, PurchasePart, RecurringFrequency } from './types';

/**
 * Sikkerhetskopi som fil: alt i én JSON-fil, og kjøpene som CSV. Ren logikk. Filene skrives og
 * deles i `backupFiles.ts`.
 *
 * Formatet har et versjonsnummer. En fil fra en eldre versjon oppgraderes i `upgrade`, og dataene
 * inne i den går gjennom `loadData` og `loadMoney`, som fyller inn felt som kom senere, akkurat som
 * når appen leser sine egne data. En fil fra en nyere versjon av Vane avvises.
 */
export const BACKUP_VERSION = 1;

export type BackupFile = {
  app: 'vane';
  version: number;
  /** ISO-tid. */
  exportedAt: string;
  data: Data;
  money: MoneyData;
};

export function createBackup(data: Data, money: MoneyData, now: Date): BackupFile {
  return { app: 'vane', version: BACKUP_VERSION, exportedAt: now.toISOString(), data, money };
}

export function backupJson(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export type BackupError = 'notJson' | 'notVane' | 'newer' | 'damaged' | 'tooBig';

export type ReadResult = { ok: true; backup: BackupFile } | { ok: false; error: BackupError };

/**
 * Grenser for hva en fil kan inneholde. Godt over det noen bruker, men nok til at en laget eller
 * skadet fil ikke kan gjøre appen treg eller ubrukelig.
 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX = { habits: 500, categories: 200, purchases: 200_000, goalsPerDay: 100, recurring: 500, text: 2000 };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX.text;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isBool = (v: unknown) => typeof v === 'boolean';
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v);

/**
 * En ID eller nøkkel som kan brukes som felt i et objekt. `__proto__`, `constructor` og lignende
 * ville gitt noe annet enn et tall eller en verdi når appen slår dem opp.
 */
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && !(v in Object.prototype);

/** En dag som finnes: «2026-02-30» er ikke en dag. */
function isDay(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** «HH:MM» mellom 00:00 og 23:59. */
function isTime(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h <= 23 && m <= 59;
}

const COLORS = new Set(['salvie', 'himmel', 'lavendel', 'fersken', 'sand', 'rose', 'skifer']);
const CURRENCY = /^[A-Z]{3}$/;
const isCurrency = (v: unknown) => typeof v === 'string' && CURRENCY.test(v);

/** En liste der hvert element er gyldig og har sin egen ID. */
function validList(v: unknown, max: number, valid: (x: unknown) => boolean): boolean {
  if (!Array.isArray(v) || v.length > max || !v.every(valid)) return false;
  const ids = v.map((x) => (x as { id: string }).id);
  return new Set(ids).size === ids.length;
}

function validHabit(h: unknown): boolean {
  if (!isObject(h) || !isId(h.id) || !isText(h.name) || !isText(h.unit) || !COLORS.has(h.color as string)) return false;
  if (h.type !== 'check' && h.type !== 'count') return false;
  if (!isCount(h.target) || h.target < 1 || h.target > 1000) return false;
  if (h.reminder !== null && !isTime(h.reminder)) return false;
  if (!isDay(h.createdAt)) return false;
  const s = h.schedule;
  if (!isObject(s)) return false;
  if (s.kind === 'daily') return true;
  if (s.kind === 'weekly') return isCount(s.times) && s.times >= 1 && s.times <= 7;
  if (s.kind === 'days') return Array.isArray(s.days) && s.days.length === 7 && s.days.every(isBool);
  return false;
}

const validGoal = (g: unknown) => isObject(g) && isId(g.id) && isText(g.text) && isBool(g.done);

function validSettings(s: unknown): boolean {
  if (!isObject(s)) return false;
  return (
    optional(s.morningEnabled, isBool) &&
    optional(s.morningTime, isTime) &&
    optional(s.remindersEnabled, isBool) &&
    optional(s.weekStart, (v) => v === null || v === 'mon' || v === 'sun') &&
    optional(s.modules, (v) => isObject(v) && Object.values(v).every(isBool)) &&
    optional(s.onboarded, isBool) &&
    optional(s.eveningEnabled, isBool) &&
    optional(s.eveningTime, isTime)
  );
}

/** Vanene, loggene, målene og innstillingene må være med. Felt som kom senere, fylles inn av `loadData`. */
function validData(d: unknown): boolean {
  if (!isObject(d) || !validList(d.habits, MAX.habits, validHabit)) return false;
  if (!isObject(d.logs) || !isObject(d.goals) || !validSettings(d.settings)) return false;
  for (const [day, log] of Object.entries(d.logs)) {
    if (!isDay(day) || !isObject(log)) return false;
    if (!Object.entries(log).every(([id, v]) => isId(id) && isCount(v))) return false;
  }
  for (const [day, list] of Object.entries(d.goals)) {
    if (!isDay(day) || !validList(list, MAX.goalsPerDay, validGoal)) return false;
  }
  if (!optional(d.goalsSkipped, (v) => isObject(v) && Object.keys(v).every(isDay))) return false;
  // Dagboken kom etter de første eksportene, så den kan mangle.
  return optional(
    d.journal,
    (v) => isObject(v) && Object.entries(v).every(([day, e]) => isDay(day) && isObject(e) && (e.mood === null || isMood(e.mood)) && typeof e.text === 'string' && e.text.length <= MAX_JOURNAL_TEXT)
  );
}

function validPart(x: unknown) {
  return isObject(x) && isId(x.categoryId) && isCount(x.amount);
}

function validPurchase(p: unknown): boolean {
  if (!isObject(p) || !isId(p.id) || !isCount(p.amount) || !isCurrency(p.currency)) return false;
  if (!isText(p.merchant) || !(p.merchantKey === '' || isId(p.merchantKey)) || !isText(p.note)) return false;
  if (!isDay(p.day) || !isTime(p.time) || !isBool(p.skipped) || (p.source !== 'applepay' && p.source !== 'manual')) return false;
  // Delene må være hele beløpet, ellers kan kjøpet ikke endres senere (se `partsAreValid`).
  return Array.isArray(p.parts) && p.parts.length <= 50 && p.parts.every(validPart) && partsAreValid(p.amount, p.parts as PurchasePart[]);
}

function validCategory(c: unknown) {
  return isObject(c) && isId(c.id) && isText(c.name) && isText(c.icon) && COLORS.has(c.color as string) && optional(c.hidden, isBool);
}

/**
 * En fast utgift. Beløpet er over 0, ellers kan den ikke endres senere (se `updateRecurring`), og et
 * helt tall JavaScript kan regne sikkert med, så summen per måned ikke blir uendelig.
 */
function validRecurring(e: unknown): boolean {
  if (!isObject(e) || !isId(e.id) || !isText(e.name) || !(e.name as string).trim() || !isCount(e.amount) || e.amount < 1 || !Number.isSafeInteger(e.amount)) return false;
  if (!isCurrency(e.currency) || !FREQUENCIES.includes(e.frequency as RecurringFrequency) || !isDay(e.anchor)) return false;
  return (e.categoryId === null || isId(e.categoryId)) && isText(e.note) && isBool(e.remind) && (e.merchantKey === '' || isId(e.merchantKey));
}

/** Kjøpene og kategoriene må være med. Faste utgifter kom senere, så de kan mangle. */
function validMoney(m: unknown): boolean {
  if (!isObject(m) || !validList(m.purchases, MAX.purchases, validPurchase) || !validList(m.categories, MAX.categories, validCategory)) return false;
  return (
    optional(m.merchants, (v) => isObject(v) && Object.entries(v).every(([k, x]) => isId(k) && isObject(x) && optional(x.name, isText) && optional(x.categoryId, isId))) &&
    optional(m.imported, (v) => Array.isArray(v) && v.every(isId)) &&
    optional(m.setupSeen, isBool) &&
    optional(m.currency, (v) => v === null || isCurrency(v)) &&
    optional(m.recurring, (v) => validList(v, MAX.recurring, validRecurring)) &&
    optional(m.recurringDismissed, (v) => Array.isArray(v) && v.length <= MAX_DISMISSED && v.every(isId))
  );
}

/** Eldre versjoner av filen gjøres om til dagens. Versjon 1 er den første. */
function upgrade(file: Record<string, unknown>): Record<string, unknown> {
  return file;
}

/** Leser en sikkerhetskopi. En fil som ikke kan leses helt, gir en feil og erstatter aldri noe. */
export function readBackup(text: string): ReadResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: 'tooBig' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (!isObject(parsed) || parsed.app !== 'vane' || !isCount(parsed.version) || parsed.version < 1) return { ok: false, error: 'notVane' };
  if (parsed.version > BACKUP_VERSION) return { ok: false, error: 'newer' };
  const file = upgrade(parsed);
  if (!validData(file.data) || !validMoney(file.money)) return { ok: false, error: 'damaged' };
  return {
    ok: true,
    backup: {
      app: 'vane',
      version: BACKUP_VERSION,
      exportedAt: isText(file.exportedAt) ? file.exportedAt : '',
      data: loadData(file.data),
      money: loadMoney(file.money),
    },
  };
}

export type BackupSummary = { habits: number; days: number; goals: number; journal: number; purchases: number; recurring: number; exportedAt: Date | null };

export function summarizeBackup(b: BackupFile): BackupSummary {
  const at = new Date(b.exportedAt);
  return {
    habits: b.data.habits.length,
    days: Object.keys(b.data.logs).length,
    goals: Object.values(b.data.goals).reduce((n, list) => n + list.length, 0),
    journal: Object.keys(b.data.journal).length,
    purchases: b.money.purchases.length,
    recurring: b.money.recurring.length,
    exportedAt: Number.isNaN(at.getTime()) ? null : at,
  };
}

/**
 * Dataene etter import: alt fra filen. Lista over kjøp som er tatt inn fra Snarveier slås sammen
 * med telefonens, så et kjøp som allerede er tatt inn her, ikke kommer inn på nytt. Det samme gjelder
 * steder man har sagt «Ikke foreslå» til, så en eldre fil ikke tar dem fram igjen.
 */
export function restoreBackup(b: BackupFile, current: MoneyData): { data: Data; money: MoneyData } {
  const imported = [...new Set([...b.money.imported, ...current.imported])].slice(-MAX_IMPORTED);
  const recurringDismissed = [...new Set([...b.money.recurringDismissed, ...current.recurringDismissed])].slice(-MAX_DISMISSED);
  return { data: b.data, money: { ...b.money, imported, recurringDismissed, setupSeen: b.money.setupSeen || current.setupSeen } };
}

/**
 * Et felt i CSV: i anførselstegn når det trengs, og aldri tolket som formel i et regneark. Et
 * regneark med semikolon som skilletegn (Excel på norsk) deler feltet ved «;», så det som starter
 * med =, +, - eller @ etter et skilletegn eller mellomrom, får også en apostrof foran.
 */
function csvField(value: string): string {
  const safe = value.replace(/(^|[;\t\r\n])(\s*)(?=[=+\-@])/g, "$1$2'");
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Byte order mark, så Excel leser filen som UTF-8 (æøå og «»). */
const BOM = '\uFEFF';

const decimal = (cents: number) => (cents / 100).toFixed(2);

/**
 * Kjøpene som CSV, nyeste først: én rad per del for et oppdelt kjøp, og én rad uten kategori for
 * et kjøp som venter. Overskriftene og standardkategoriene er på telefonens språk.
 */
export function purchasesCsv(money: MoneyData): string {
  const h = tr.backup.csv;
  const rows = [[h.date, h.time, h.place, h.amount, h.currency, h.category, h.note, h.notCounted]];
  for (const p of money.purchases) {
    const parts = p.parts.length ? p.parts : [{ categoryId: '', amount: p.amount }];
    for (const part of parts) {
      const c = part.categoryId ? categoryById(money, part.categoryId) : undefined;
      const category = c ? categoryName(c) : part.categoryId ? tr.money.deletedCategory : '';
      rows.push([p.day, p.time, merchantName(money, p), decimal(part.amount), p.currency, category, p.note, p.skipped ? h.yes : '']);
    }
  }
  return BOM + rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** «vane-2026-11-04.json» */
export const backupFileName = (day: string) => `vane-${day}.json`;
export const csvFileName = (day: string) => `${tr.backup.csvPrefix}-${day}.csv`;

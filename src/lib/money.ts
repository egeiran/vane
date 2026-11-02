import type { SFSymbol } from 'sf-symbols-typescript';

import { getLang, stringsFor, tr, type Lang } from '@/i18n';

import { daysBetween, formatShort, relativeDayName, type DateKey } from './dates';
import { getDeviceRegion, showTime } from './region';
import type { Category, MoneyData, Purchase } from './types';

/**
 * Penger: kjøp fra Apple Pay (via Snarveier) eller lagt inn for hånd, sortert i kategorier.
 * Beløp er alltid i hundredeler (øre, cent). Bare hovedvalutaen telles med i summene; andre
 * valutaer vises for seg.
 *
 * Stedsnavn og beløp leses også i Swift når varselet lages (`app-intents/PurchaseText.swift`).
 * `merchantKey`, `cleanMerchant`, `parseAmount` og `formatAmount` må gjøre det samme der.
 */

/**
 * Standardkategoriene lagres med norske navn. Så lenge navnet er det samme, vises det på brukerens
 * språk (`categoryName`). Gir man kategorien nytt navn, vises det man skrev.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'dagligvarer', name: 'Dagligvarer', icon: 'cart', color: 'salvie', hidden: false },
  { id: 'spise-ute', name: 'Spise ute', icon: 'fork.knife', color: 'fersken', hidden: false },
  { id: 'transport', name: 'Transport', icon: 'tram.fill', color: 'himmel', hidden: false },
  { id: 'hjem', name: 'Hjem', icon: 'house', color: 'sand', hidden: false },
  { id: 'shopping', name: 'Shopping', icon: 'bag', color: 'rose', hidden: false },
  { id: 'fritid', name: 'Fritid', icon: 'ticket', color: 'lavendel', hidden: false },
  { id: 'annet', name: 'Annet', icon: 'ellipsis.circle', color: 'skifer', hidden: false },
];

/** Stedet når et kjøp ikke har noe. Lagres alltid slik, og vises oversatt (`merchantName`). */
export const UNKNOWN_PLACE = stringsFor('nb').money.unknownPlace;

/** Navnet på en kategori slik brukeren skal se det: oversatt for standardkategorier som ikke har fått nytt navn. */
export function categoryName(c: Pick<Category, 'id' | 'name'>): string {
  const original = stringsFor('nb').defaultCategories[c.id];
  return original !== undefined && c.name === original ? (tr.defaultCategories[c.id] ?? c.name) : c.name;
}

/** Ikonene man kan velge for en kategori. */
export const CATEGORY_ICONS: SFSymbol[] = [
  'cart',
  'basket',
  'fork.knife',
  'cup.and.saucer',
  'takeoutbag.and.cup.and.straw',
  'wineglass',
  'tram.fill',
  'bus',
  'car',
  'fuelpump',
  'bicycle',
  'airplane',
  'house',
  'bolt',
  'wrench.and.screwdriver',
  'bag',
  'tshirt',
  'gift',
  'ticket',
  'film',
  'music.note',
  'gamecontroller',
  'book',
  'dumbbell',
  'figure.run',
  'heart',
  'cross.case',
  'pills',
  'scissors',
  'stroller',
  'figure.2.and.child.holdinghands',
  'pawprint',
  'leaf',
  'graduationcap',
  'phone',
  'creditcard',
  'banknote',
  'tag',
  'sparkles',
  'ellipsis.circle',
];

export const EMPTY_MONEY: MoneyData = {
  categories: DEFAULT_CATEGORIES,
  purchases: [],
  merchants: {},
  imported: [],
  setupSeen: false,
  currency: null,
};

const NBSP = ' ';

/** Unicode-normalisering (NFKC), så for eksempel hardt mellomrom blir vanlig mellomrom. */
function nfkc(s: string): string {
  try {
    return s.normalize('NFKC');
  } catch {
    return s;
  }
}

/** Bokstaver som har store og små varianter. */
const isCased = (ch: string) => ch.toLowerCase() !== ch.toUpperCase();

/**
 * Nøkkelen et sted huskes under: store bokstaver, uten mellomrom og ASCII-tegnsetting.
 * «Rema 1000» og «REMA-1000» er samme sted.
 */
export function merchantKey(raw: string): string {
  return nfkc(raw)
    .toUpperCase()
    .replace(/[\s!-/:-@[-`{-~]/g, '');
}

const WORD_BREAK = ' -/&(';
const DROP_LAST = ['NO', 'NOR', 'NORGE', 'NORWAY', 'AS', 'ASA'];

function titleCase(s: string): string {
  let out = '';
  let start = true;
  for (const ch of s.toLowerCase()) {
    out += start && isCased(ch) ? ch.toUpperCase() : ch;
    start = WORD_BREAK.includes(ch);
  }
  return out;
}

/**
 * Gjør navnet fra terminalen lesbart: «SUMUP *KAFE FUGLEN 0123456 NO» blir «Kafe Fuglen».
 * Tar det som står etter siste `*`, fjerner terminalnumre og landkode, og gjør STORE BOKSTAVER
 * om til vanlige. Navn som allerede har små bokstaver, får stå.
 */
export function cleanMerchant(raw: string): string {
  let s = nfkc(raw).split(/\s+/).filter(Boolean).join(' ');
  const star = s.lastIndexOf('*');
  if (star >= 0) {
    const after = s.slice(star + 1).trim();
    if (after) s = after;
  }
  const words = s.split(' ').filter((w) => w && !/^\d{5,}$/.test(w) && !/^#\d+$/.test(w));
  while (words.length > 1 && DROP_LAST.includes(words[words.length - 1])) words.pop();
  s = words.join(' ');
  if (s === s.toUpperCase() && [...s].some(isCased)) s = titleCase(s);
  return s || raw.trim() || UNKNOWN_PLACE;
}

/** Valutaer som skrives med `$`. Er hovedvalutaen en av dem, betyr `$` hovedvalutaen. */
export const DOLLARS = ['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD'];
/** Valutaer som skrives «kr». */
export const KRONER = ['NOK', 'SEK', 'DKK', 'ISK'];

/** Dollar med landskode foran, slik iOS skriver dollar fra andre land: «US$», «CA$», «A$», «R$». */
const DOLLAR_PREFIXES: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  A: 'AUD',
  AU: 'AUD',
  NZ: 'NZD',
  HK: 'HKD',
  S: 'SGD',
  SG: 'SGD',
  MX: 'MXN',
  R: 'BRL',
};

/** Hovedvalutaen: den brukeren har valgt, ellers den telefonen bruker. */
export function mainCurrency(data: Pick<MoneyData, 'currency'>, device = getDeviceRegion().currency): string {
  return data.currency ?? device;
}

/**
 * Valutaen i et beløp: en kode med tre store bokstaver, ellers et tegn, ellers hovedvalutaen.
 * «US$», «CA$» osv. er den dollaren. En `$` alene er hovedvalutaen når den er en dollar (ellers
 * USD), og «kr» er hovedvalutaen når den er en krone (ellers NOK).
 */
function currencyIn(s: string, main: string): string {
  const code = s.match(/(?:^|[^A-Za-z])([A-Z]{3})(?![A-Za-z])/);
  if (code) return code[1];
  const prefixed = s.match(/([A-Z]{1,2})\$/);
  if (prefixed && DOLLAR_PREFIXES[prefixed[1]]) return DOLLAR_PREFIXES[prefixed[1]];
  if (s.includes('€')) return 'EUR';
  if (s.includes('$')) return DOLLARS.includes(main) ? main : 'USD';
  if (s.includes('£')) return 'GBP';
  if (/kr/i.test(s)) return KRONER.includes(main) ? main : 'NOK';
  return main;
}

/**
 * Leser et beløp slik Snarveier eller et tekstfelt gir det, på norsk, engelsk eller tysk telefon:
 * «kr 149,00», «1 234,50 kr», «149,-», «€12.50», «12,50 €», «$1,234.50», «149». Tre siffer etter
 * siste skilletegn er tusenskille («1.234», «1,234»), ellers desimaler. Gir beløpet i hundredeler
 * og valutaen (hovedvalutaen hvis ingen er nevnt), eller null uten tall eller med over 15 siffer.
 */
export function parseAmount(text: string, main = 'NOK'): { amount: number; currency: string } | null {
  const s = nfkc(text);
  const match = s.match(/\d[\d .,']*/);
  if (!match) return null;
  const num = match[0].replace(/[ ']/g, '').replace(/[.,]+$/, '');
  let whole = num;
  let frac = '';
  const sep = Math.max(num.lastIndexOf(','), num.lastIndexOf('.'));
  if (sep >= 0 && num.length - sep - 1 !== 3) {
    whole = num.slice(0, sep);
    frac = num.slice(sep + 1);
  }
  const digits = whole.replace(/[.,]/g, '');
  // Over 15 siffer er ikke et beløp (og Swift ville fått overflyt).
  if (digits.length > 15) return null;
  const kroner = Number(digits || '0');
  const ore = frac ? Math.round(Number(`0.${frac}`) * 100) : 0;
  return { amount: kroner * 100 + ore, currency: currencyIn(s, main) };
}

/** Tegnet foran beløpet på engelsk. Andre valutaer skrives med koden. */
const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

/**
 * Norsk: «149 kr», «1 234,50 kr», «12,50 EUR». Engelsk: «$1,234.50», «€12.50», «NOK 149».
 * `PurchaseText.formatAmount` i Swift gjør det samme.
 */
export function formatAmount(amount: number, currency = 'NOK', lang: Lang = getLang()): string {
  const abs = Math.abs(Math.round(amount));
  const ore = abs % 100;
  const fraction = ore ? String(ore).padStart(2, '0') : '';
  if (lang === 'en') {
    const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const num = fraction ? `${whole}.${fraction}` : whole;
    return SYMBOLS[currency] ? `${SYMBOLS[currency]}${num}` : `${currency}${NBSP}${num}`;
  }
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const num = fraction ? `${whole},${fraction}` : whole;
  return `${num}${NBSP}${currency === 'NOK' ? 'kr' : currency}`;
}

/** Valutaen ved et tekstfelt for beløp: «kr», «$», «EUR». */
export function currencyLabel(currency: string, lang: Lang = getLang()): string {
  if (lang === 'en') return SYMBOLS[currency] ?? currency;
  return currency === 'NOK' ? 'kr' : currency;
}

/** Beløpet slik det står i et tekstfelt: «149» eller «149,50» (på engelsk «149.50»). */
export function amountInputText(amount: number, lang: Lang = getLang()): string {
  if (!amount) return '';
  const ore = amount % 100;
  const sep = lang === 'en' ? '.' : ',';
  return ore ? `${Math.floor(amount / 100)}${sep}${String(ore).padStart(2, '0')}` : String(amount / 100);
}

export function merchantName(data: MoneyData, p: Pick<Purchase, 'merchant' | 'merchantKey'>): string {
  const name = data.merchants[p.merchantKey]?.name || p.merchant;
  return name === UNKNOWN_PLACE ? tr.money.unknownPlace : name;
}

export function categoryById(data: MoneyData, id: string): Category | undefined {
  return data.categories.find((c) => c.id === id);
}

export function visibleCategories(data: MoneyData): Category[] {
  return data.categories.filter((c) => !c.hidden);
}

export const isPending = (p: Purchase) => !p.skipped && p.parts.length === 0;

export function pendingPurchases(data: MoneyData): Purchase[] {
  return data.purchases.filter(isPending);
}

/** Kategorien man valgte sist for stedet, hvis den fortsatt er i bruk. */
export function suggestionForKey(data: MoneyData, key: string): Category | null {
  const id = data.merchants[key]?.categoryId;
  const c = id ? categoryById(data, id) : undefined;
  return c && !c.hidden ? c : null;
}

export function suggestionFor(data: MoneyData, p: Purchase): Category | null {
  return suggestionForKey(data, p.merchantKey);
}

/** «I dag 14:32», «I går 09:10», «23. okt 18:00». */
export function purchaseWhen(p: Purchase, today: DateKey): string {
  const diff = daysBetween(p.day, today);
  return `${diff === 0 || diff === 1 ? relativeDayName(p.day, today) : formatShort(p.day)} ${showTime(p.time)}`;
}

// Måneder

/** 'YYYY-MM' */
export type MonthKey = string;

export const monthOf = (day: DateKey): MonthKey => day.slice(0, 7);

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const monthIndex = (month: MonthKey) => Number(month.slice(5, 7)) - 1;

/** «oktober», eller «oktober 2025» når det ikke er i år. */
export function monthName(month: MonthKey, today: DateKey): string {
  const name = tr.dates.months[monthIndex(month)];
  return month.slice(0, 4) === today.slice(0, 4) ? name : tr.dates.monthYear(name, month.slice(0, 4));
}

/** «okt» */
export const monthShort = (month: MonthKey) => tr.dates.monthsShort[monthIndex(month)];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type MonthSummary = {
  month: MonthKey;
  /** Hovedvalutaen, som `total`, `pending` og `byCategory` er i. */
  currency: string;
  /** Brukt i hovedvalutaen, også det som venter. Kjøp som ikke telles med, er ikke med. */
  total: number;
  /** Det som venter på kategori, i hovedvalutaen. */
  pending: number;
  /** Per kategori, størst først. */
  byCategory: { categoryId: string; amount: number }[];
  /** Kjøp i andre valutaer, sum per valuta. */
  other: Record<string, number>;
  /** Kjøp som er talt med (alle valutaer). */
  count: number;
  /** Kjøp som ikke telles med. */
  skipped: number;
};

export function monthSummary(data: MoneyData, month: MonthKey): MonthSummary {
  const currency = mainCurrency(data);
  const sums = new Map<string, number>();
  const other: Record<string, number> = {};
  let total = 0;
  let pending = 0;
  let count = 0;
  let skipped = 0;
  for (const p of data.purchases) {
    if (monthOf(p.day) !== month) continue;
    if (p.skipped) {
      skipped++;
      continue;
    }
    count++;
    if (p.currency !== currency) {
      other[p.currency] = (other[p.currency] ?? 0) + p.amount;
      continue;
    }
    total += p.amount;
    if (!p.parts.length) pending += p.amount;
    for (const part of p.parts) sums.set(part.categoryId, (sums.get(part.categoryId) ?? 0) + part.amount);
  }
  const order = (id: string) => {
    const i = data.categories.findIndex((c) => c.id === id);
    return i < 0 ? data.categories.length : i;
  };
  const byCategory = [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount || order(a.categoryId) - order(b.categoryId));
  return { month, currency, total, pending, byCategory, other, count, skipped };
}

/** De siste `n` månedene til og med denne, eldste først. */
export function recentMonths(data: MoneyData, today: DateKey, n = 6): MonthSummary[] {
  const current = monthOf(today);
  return Array.from({ length: n }, (_, i) => monthSummary(data, addMonths(current, i - n + 1)));
}

export type PurchaseFilter = { month?: MonthKey; categoryId?: string; query?: string };

/** Kjøp som passer filteret, nyeste først. Søket gjelder sted og notat. */
export function findPurchases(data: MoneyData, filter: PurchaseFilter): Purchase[] {
  const q = filter.query?.trim().toLowerCase();
  return data.purchases.filter((p) => {
    if (filter.month && monthOf(p.day) !== filter.month) return false;
    if (filter.categoryId && !p.parts.some((part) => part.categoryId === filter.categoryId)) return false;
    if (q && !merchantName(data, p).toLowerCase().includes(q) && !p.note.toLowerCase().includes(q)) return false;
    return true;
  });
}

/**
 * Det Swift-koden trenger for å lage varselet når et kjøp kommer inn, uten at appen kjører:
 * navnene på kategoriene som er i bruk, hva hvert sted heter og fikk sist, hovedvalutaen, og om
 * Penger er slått på. Er Penger av, lagres kjøp fra Snarveier, men Swift sender ikke varsel.
 */
export type NativePurchaseConfig = {
  categories: Record<string, string>;
  merchants: Record<string, { name?: string; categoryId?: string }>;
  currency: string;
  enabled: boolean;
};

export function nativePurchaseConfig(data: MoneyData, enabled = true): NativePurchaseConfig {
  const categories = Object.fromEntries(visibleCategories(data).map((c) => [c.id, categoryName(c)]));
  const merchants: NativePurchaseConfig['merchants'] = {};
  for (const [key, m] of Object.entries(data.merchants)) {
    const entry: { name?: string; categoryId?: string } = {};
    if (m.name) entry.name = m.name;
    if (m.categoryId && categories[m.categoryId]) entry.categoryId = m.categoryId;
    if (entry.name || entry.categoryId) merchants[key] = entry;
  }
  return { categories, merchants, currency: mainCurrency(data), enabled };
}

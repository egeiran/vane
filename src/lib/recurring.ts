import { tr } from '@/i18n';

import { addDays, atTime, daysBetween, formatShort, fromKey, todayKey, toKey, type DateKey } from './dates';
import { addMonths, categoryById, formatAmount, mainCurrency, merchantKey, merchantName, monthOf, type MonthKey } from './money';
import { newId } from './state';
import type { MoneyData, Purchase, RecurringExpense, RecurringFrequency, Settings } from './types';

/**
 * Faste utgifter: husleie, strøm, abonnementer. Ren logikk. De ligger i pengedataene, men telles
 * aldri med i kjøpene og månedens sum, så ingenting telles to ganger. Penger viser dem som en egen
 * linje: hva som går ut i måneden. Ingen budsjett og ingen rødfarge.
 */

export const FREQUENCIES: RecurringFrequency[] = ['week', 'month', 'year'];

/** Faste utgifter vises bare når både Penger og modulen er på. Ingenting slettes når de er av. */
export const recurringOn = (s: Pick<Settings, 'modules'>) => s.modules.money && s.modules.recurring;

const daysInMonth = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate();

/** Dag `day` i måneden, eller siste dag når måneden er kortere: den 31. blir den 30. eller 28. */
function dayInMonth(year: number, month0: number, day: number): DateKey {
  const first = new Date(year, month0, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  return toKey(new Date(y, m, Math.min(day, daysInMonth(y, m))));
}

/** Samme dag `n` måneder fram (eller tilbake). Den 31. januar pluss én måned er 28. februar. */
export function shiftMonths(day: DateKey, n: number): DateKey {
  const d = fromKey(day);
  return dayInMonth(d.getFullYear(), d.getMonth() + n, d.getDate());
}

type Schedule = Pick<RecurringExpense, 'anchor' | 'frequency'>;

/**
 * Trekk nummer `n` etter ankeret (0 er ankeret). Regnes alltid fra ankeret, så et trekk den 31.
 * er den 31. igjen etter en kort måned, og 29. februar er 28. februar i år som ikke er skuddår.
 */
export function chargeAt(e: Schedule, n: number): DateKey {
  if (e.frequency === 'week') return addDays(e.anchor, 7 * n);
  const a = fromKey(e.anchor);
  if (e.frequency === 'month') return dayInMonth(a.getFullYear(), a.getMonth() + n, a.getDate());
  return dayInMonth(a.getFullYear() + n, a.getMonth(), a.getDate());
}

/** Første trekk den dagen eller senere. */
export function chargeOnOrAfter(e: Schedule, day: DateKey): DateKey {
  if (e.anchor >= day) return e.anchor;
  const a = fromKey(e.anchor);
  const d = fromKey(day);
  let n =
    e.frequency === 'week'
      ? Math.ceil(daysBetween(e.anchor, day) / 7)
      : e.frequency === 'month'
        ? (d.getFullYear() - a.getFullYear()) * 12 + d.getMonth() - a.getMonth()
        : d.getFullYear() - a.getFullYear();
  let charge = chargeAt(e, n);
  while (charge < day) charge = chargeAt(e, ++n);
  return charge;
}

/** Neste trekk: i dag, hvis det trekkes i dag. */
export const nextCharge = (e: Schedule, today: DateKey): DateKey => chargeOnOrAfter(e, today);

/** Hvor mye som går ut i en vanlig måned, uten avrunding: en uke er 52/12 av en måned. */
function perMonthExact(e: Pick<RecurringExpense, 'amount' | 'frequency'>): number {
  if (e.frequency === 'week') return (e.amount * 52) / 12;
  if (e.frequency === 'year') return e.amount / 12;
  return e.amount;
}

/** Hvor mye som går ut i en vanlig måned, i øre. */
export const monthlyAmount = (e: Pick<RecurringExpense, 'amount' | 'frequency'>) => Math.round(perMonthExact(e));

export type RecurringSummary = {
  /** Hovedvalutaen, som `perMonth` er i. */
  currency: string;
  /** Det som går ut i en vanlig måned, i hovedvalutaen. */
  perMonth: number;
  /** Faste utgifter i andre valutaer, per måned per valuta. */
  other: Record<string, number>;
  /**
   * Det som vises som summen: hovedvalutaen først når noen er i den, så de andre. Er alle i en annen
   * valuta (hovedvalutaen er byttet), står ikke «0 kr» først.
   */
  totals: { currency: string; amount: number }[];
  count: number;
};

export function recurringSummary(data: MoneyData): RecurringSummary {
  const currency = mainCurrency(data);
  const sums: Record<string, number> = {};
  for (const e of data.recurring) sums[e.currency] = (sums[e.currency] ?? 0) + perMonthExact(e);
  const other: Record<string, number> = {};
  for (const [cur, sum] of Object.entries(sums)) if (cur !== currency) other[cur] = Math.round(sum);
  const perMonth = Math.round(sums[currency] ?? 0);
  const totals = [
    ...(sums[currency] !== undefined ? [{ currency, amount: perMonth }] : []),
    ...Object.entries(other).map(([cur, amount]) => ({ currency: cur, amount })),
  ];
  return { currency, perMonth, other, totals, count: data.recurring.length };
}

export type UpcomingCharge = { expense: RecurringExpense; next: DateKey };

/** Alle faste utgifter med neste trekk, det nærmeste først (og det største først samme dag). */
export function upcomingRecurring(data: MoneyData, today: DateKey): UpcomingCharge[] {
  return data.recurring
    .map((expense) => ({ expense, next: nextCharge(expense, today) }))
    .sort((a, b) => (a.next < b.next ? -1 : a.next > b.next ? 1 : b.expense.amount - a.expense.amount));
}

/** Dagen for et trekk, inne i en setning: «i dag», «i morgen» eller «3. des». */
export function chargeDay(day: DateKey, today: DateKey): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return tr.dates.today.toLowerCase();
  if (diff === 1) return tr.dates.tomorrow.toLowerCase();
  return formatShort(day);
}

// Endringer

export type RecurringInput = Pick<RecurringExpense, 'name' | 'amount' | 'frequency' | 'anchor' | 'categoryId' | 'note' | 'remind'> & {
  /** Stedet, når den legges inn fra et forslag. */
  merchantKey?: string;
};

export type RecurringPatch = Partial<Omit<RecurringInput, 'merchantKey'>>;

const validInput = (e: Pick<RecurringExpense, 'name' | 'amount' | 'frequency'>) =>
  !!e.name.trim() && Number.isSafeInteger(e.amount) && e.amount > 0 && FREQUENCIES.includes(e.frequency);

/** En ny fast utgift i hovedvalutaen. Uten navn eller beløp blir det ingen. */
export function addRecurring(data: MoneyData, input: RecurringInput, id = newId('r')): MoneyData {
  if (!validInput(input)) return data;
  const expense: RecurringExpense = {
    id,
    name: input.name.trim(),
    amount: input.amount,
    currency: mainCurrency(data),
    frequency: input.frequency,
    anchor: input.anchor,
    categoryId: input.categoryId,
    note: input.note.trim(),
    remind: input.remind,
    merchantKey: input.merchantKey ?? '',
  };
  return { ...data, recurring: [...data.recurring, expense] };
}

/** Endrer en fast utgift. Tomt navn eller beløp 0 gir ingen endring. Valutaen og stedet står. */
export function updateRecurring(data: MoneyData, id: string, patch: RecurringPatch): MoneyData {
  const current = data.recurring.find((e) => e.id === id);
  if (!current) return data;
  const next: RecurringExpense = {
    ...current,
    ...patch,
    name: (patch.name ?? current.name).trim(),
    note: (patch.note ?? current.note).trim(),
  };
  if (!validInput(next)) return data;
  return { ...data, recurring: data.recurring.map((e) => (e.id === id ? next : e)) };
}

export function deleteRecurring(data: MoneyData, id: string): MoneyData {
  return { ...data, recurring: data.recurring.filter((e) => e.id !== id) };
}

/** Så mange steder huskes som «Ikke foreslå». */
export const MAX_DISMISSED = 200;

/** «Ikke foreslå»: stedet foreslås ikke som fast utgift igjen. */
export function dismissSuggestion(data: MoneyData, key: string): MoneyData {
  if (!key || data.recurringDismissed.includes(key)) return data;
  return { ...data, recurringDismissed: [...data.recurringDismissed, key].slice(-MAX_DISMISSED) };
}

// Forslag fra kjøpene

export type RecurringSuggestion = {
  merchantKey: string;
  name: string;
  /** Det siste beløpet, i hovedvalutaen. */
  amount: number;
  /** Det siste kjøpet: neste trekk regnes fra det. */
  anchor: DateKey;
  categoryId: string | null;
};

/** Så mange måneder bakover det ses etter forslag, denne måneden medregnet. */
const SUGGEST_MONTHS = 4;
/** Så mange måneder på rad trengs det. */
const MIN_MONTHS = 3;
/** Så gammelt kan det siste kjøpet være. Et abonnement som er sagt opp, foreslås ikke. */
const MAX_AGE_DAYS = 45;
export const MAX_SUGGESTIONS = 3;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Den største delen av kjøpet, hvis kategorien fortsatt er i bruk. */
function categoryOf(data: MoneyData, p: Purchase): string | null {
  if (!p.parts.length) return null;
  const biggest = p.parts.reduce((a, b) => (b.amount > a.amount ? b : a));
  const c = categoryById(data, biggest.categoryId);
  return c && !c.hidden ? c.id : null;
}

/**
 * Steder som ser ut som en fast utgift: ett kjøp i måneden, med omtrent samme beløp (±10 %), tre
 * måneder på rad, og det siste for under 45 dager siden. Bare kjøp i hovedvalutaen som telles med.
 * Steder som er lagt inn som fast utgift, eller som man har sagt «Ikke foreslå» til, er ikke med.
 * Butikker man handler i flere ganger i måneden, blir aldri foreslått. Største beløp først.
 */
export function suggestRecurring(data: MoneyData, today: DateKey): RecurringSuggestion[] {
  const currency = mainCurrency(data);
  const current = monthOf(today);
  const first = addMonths(current, -(SUGGEST_MONTHS - 1));
  const taken = new Set(data.recurringDismissed);
  for (const e of data.recurring) {
    if (e.merchantKey) taken.add(e.merchantKey);
    taken.add(merchantKey(e.name));
  }

  // Per sted og måned: det første kjøpet og hvor mange det er. Mer trengs ikke, fordi en måned med
  // flere kjøp stopper rekka, og det holder tiden lineær også med mange kjøp fra samme sted.
  const byPlace = new Map<string, Map<MonthKey, { first: Purchase; count: number }>>();
  for (const p of data.purchases) {
    const month = monthOf(p.day);
    // Kjøpene ligger nyeste først, så resten er eldre enn de fire månedene.
    if (month < first) break;
    if (!p.merchantKey || taken.has(p.merchantKey) || p.skipped || p.amount <= 0 || p.currency !== currency || p.day > today) continue;
    let months = byPlace.get(p.merchantKey);
    if (!months) byPlace.set(p.merchantKey, (months = new Map()));
    const seen = months.get(month);
    if (seen) seen.count++;
    else months.set(month, { first: p, count: 1 });
  }

  const out: RecurringSuggestion[] = [];
  for (const [key, months] of byPlace) {
    // Månedene på rad, bakover fra denne måneden, eller fra forrige når det ikke er trukket ennå.
    const run: Purchase[] = [];
    for (let m = months.has(current) ? current : addMonths(current, -1); months.has(m); m = addMonths(m, -1)) {
      const { first, count } = months.get(m)!;
      if (count !== 1) break;
      run.push(first);
    }
    if (run.length < MIN_MONTHS) continue;
    const latest = run[0];
    if (daysBetween(latest.day, today) > MAX_AGE_DAYS) continue;
    const mid = median(run.map((p) => p.amount));
    if (!run.every((p) => Math.abs(p.amount - mid) * 10 <= mid)) continue;
    out.push({ merchantKey: key, name: merchantName(data, latest), amount: latest.amount, anchor: latest.day, categoryId: categoryOf(data, latest) });
  }
  return out.sort((a, b) => b.amount - a.amount).slice(0, MAX_SUGGESTIONS);
}

// Varsel dagen før

/** Varselet kommer dagen før trekket, på dette klokkeslettet. */
export const RECURRING_REMINDER_TIME = '09:00';
/** Så mange varsler for faste utgifter legges inn (de nærmeste). Vanepåminnelsene får resten. */
export const MAX_RECURRING_REMINDERS = 8;
/**
 * Trekk så langt fram får varsel. Neste trekk får det alltid, også et årlig trekk om ti måneder.
 * Appen legger dem inn på nytt hver gang den åpnes, som vanepåminnelsene.
 */
export const RECURRING_DAYS_AHEAD = 35;

export type PlannedRecurringReminder = {
  id: string;
  date: Date;
  title: string;
  body: string;
  data: { kind: 'recurring'; recurringId: string; day: DateKey };
};

/**
 * Varsel kl. 09 dagen før hvert trekk de neste fem ukene (og alltid før neste trekk), for de faste
 * utgiftene som har varsel på. Er tidspunktet passert (det trekkes i dag eller i morgen tidlig),
 * begynner det med trekket etter. De nærmeste først, høyst `MAX_RECURRING_REMINDERS`.
 */
export function planRecurringReminders(data: MoneyData, settings: Pick<Settings, 'modules'>, now: Date = new Date()): PlannedRecurringReminder[] {
  if (!recurringOn(settings)) return [];
  const today = todayKey(now);
  const until = addDays(today, RECURRING_DAYS_AHEAD);
  const out: PlannedRecurringReminder[] = [];
  const reminderFor = (charge: DateKey) => atTime(addDays(charge, -1), RECURRING_REMINDER_TIME);
  for (const e of data.recurring) {
    if (!e.remind) continue;
    let charge = nextCharge(e, today);
    if (reminderFor(charge).getTime() <= now.getTime()) charge = chargeOnOrAfter(e, addDays(charge, 1));
    const body = tr.notifications.recurringBody(formatAmount(e.amount, e.currency));
    do {
      out.push({
        id: `recurring:${e.id}:${charge}`,
        date: reminderFor(charge),
        title: e.name,
        body,
        data: { kind: 'recurring', recurringId: e.id, day: charge },
      });
      charge = chargeOnOrAfter(e, addDays(charge, 1));
    } while (charge <= until);
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_RECURRING_REMINDERS);
}

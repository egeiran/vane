import { addDays, type DateKey } from './dates';
import type { Data, MoneyData } from './types';

/**
 * Når Vane spør om en vurdering i App Store: tidligst etter 14 dager i bruk, og etter minst 20
 * avhukinger eller 20 kjøp med kategori. Høyst én gang per versjon. iOS viser dialogen høyst tre
 * ganger i året uansett, og aldri i TestFlight.
 */
export const REVIEW_AFTER_DAYS = 14;
export const REVIEW_AFTER_COUNT = 20;

/** App Store-ID-en (`ascAppId` i eas.json). */
export const APP_STORE_ID = '6824028383';
export const WRITE_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

/** Det Vane husker om vurderingen. Ligger for seg selv på telefonen, ikke i sikkerhetskopien. */
export type ReviewState = {
  /** Første dag appen ble brukt med denne funksjonen. Eldre bruk leses fra dataene. */
  firstUse: DateKey | null;
  /** Versjonen vi sist spurte i. */
  askedVersion: string | null;
};

export const EMPTY_REVIEW: ReviewState = { firstUse: null, askedVersion: null };

export function loadReview(raw: string | null): ReviewState {
  try {
    const p = JSON.parse(raw ?? '{}') as Partial<ReviewState>;
    return {
      firstUse: typeof p.firstUse === 'string' ? p.firstUse : null,
      askedVersion: typeof p.askedVersion === 'string' ? p.askedVersion : null,
    };
  } catch {
    return EMPTY_REVIEW;
  }
}

/**
 * Første bruksdag: den tidligste av den lagrede dagen, den første vanen og den første avhukingen,
 * så de som har brukt appen lenge, ikke må vente 14 nye dager.
 */
export function firstUseDay(review: ReviewState, data: Data, today: DateKey): DateKey {
  const days = [today, ...(review.firstUse ? [review.firstUse] : []), ...data.habits.map((h) => h.createdAt), ...Object.keys(data.logs)];
  return days.reduce((a, b) => (b < a ? b : a));
}

/** Antall avhukinger: hver vane som har en verdi en dag, teller én gang. */
export function checkOffs(data: Data): number {
  return Object.values(data.logs).reduce((n, log) => n + Object.values(log).filter((v) => v > 0).length, 0);
}

/** Kjøp med kategori (godkjent eller lagt inn med kategori). */
export function categorizedPurchases(money: MoneyData): number {
  return money.purchases.filter((p) => p.parts.length > 0).length;
}

export function shouldAskForReview(input: {
  review: ReviewState;
  data: Data;
  money: MoneyData;
  today: DateKey;
  version: string;
}): boolean {
  const { review, data, money, today, version } = input;
  if (!data.settings.onboarded) return false;
  if (review.askedVersion === version) return false;
  if (addDays(firstUseDay(review, data, today), REVIEW_AFTER_DAYS) > today) return false;
  return checkOffs(data) >= REVIEW_AFTER_COUNT || categorizedPurchases(money) >= REVIEW_AFTER_COUNT;
}

import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { AppState } from 'react-native';

import { todayKey } from './dates';
import { kvStorage } from './kvStorage';
import { getMoney } from './moneyStore';
import { firstUseDay, loadReview, shouldAskForReview, type ReviewState } from './review';
import { getData } from './store';

const KEY = 'vane-review';

/** Versjonen i App Store. Samme tall som Innstillinger viser. */
export const appVersion = () => Constants.expoConfig?.version ?? '1.0.0';

function read(): ReviewState {
  const raw = kvStorage.getItem(KEY);
  return loadReview(typeof raw === 'string' ? raw : null);
}

function write(review: ReviewState) {
  kvStorage.setItem(KEY, JSON.stringify(review));
}

let lastChange = 0;

/** Kalles når dataene endres, så vi aldri spør rett etter en avhuking eller et kjøp. */
export function noteActivity() {
  lastChange = Date.now();
}

let timer: ReturnType<typeof setTimeout> | null = null;
let asking = false;

/**
 * Når appen åpnes (starter, eller kommer tilbake fra bakgrunnen): husk første bruksdag, og spør om
 * en vurdering hvis det er tid for det. Venter litt, så skjermen er tegnet.
 */
export function scheduleReviewCheck(delay = 2000) {
  cancelReviewCheck();
  timer = setTimeout(() => {
    timer = null;
    checkReview().catch(() => {});
  }, delay);
}

/** Appen legges bort før sjekken har kjørt. */
export function cancelReviewCheck() {
  if (timer) clearTimeout(timer);
  timer = null;
}

async function checkReview() {
  const today = todayKey();
  const data = getData();
  let review = read();
  if (!review.firstUse) {
    review = { ...review, firstUse: firstUseDay(review, data, today) };
    write(review);
  }
  // Bare når appen er framme, man står på en av fanene (ikke i et skjema, en veiviser eller et
  // ark), og ingenting er endret de siste sekundene. Da avbryter vi aldri en avhuking eller et kjøp.
  if (asking || AppState.currentState !== 'active' || router.canGoBack()) return;
  if (Date.now() - lastChange < 10_000) return;
  const version = appVersion();
  if (!shouldAskForReview({ review, data, money: getMoney(), today, version })) return;
  asking = true;
  try {
    // Aldri i TestFlight, og iOS bestemmer selv om dialogen vises (høyst tre ganger i året).
    if (!(await StoreReview.isAvailableAsync())) return;
    await StoreReview.requestReview();
    // Lagres først når iOS har tatt imot, så en feil ikke bruker opp versjonen.
    write({ ...read(), askedVersion: version });
  } finally {
    asking = false;
  }
}

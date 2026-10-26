import { categoryById, isPending } from './money';
import { categorize, importPurchase } from './moneyState';
import type { MoneyData } from './types';

/**
 * Broen mellom Swift-koden i `app-intents/` og appen. Navnene her må være de samme som der.
 *
 * - Snarveier kjører «Registrer kjøp» når du betaler. Swift legger kjøpet i køen (`logPurchase`)
 *   og sender et varsel, uten at appen åpnes.
 * - Trykker du på forslaget i varselet, legger Swift et `categorizePurchase` i køen.
 * - Appen tar køen neste gang den kjører. Varselet har også med alt om kjøpet, så åpnes appen fra
 *   varselet, tas kjøpet inn derfra med en gang.
 */

export const INTENT_LOG = 'logPurchase';
export const INTENT_CATEGORIZE = 'categorizePurchase';

/** Varselkategori for et sted uten forslag. */
export const NOTIFICATION_NEW = 'purchase-new';
/** Varselkategori med forslag: `purchase-suggest:<kategori-id>`. */
export const NOTIFICATION_SUGGEST = 'purchase-suggest:';
export const ACTION_APPROVE = 'purchase-approve';
export const ACTION_PICK = 'purchase-pick';
export const ACTION_LATER = 'purchase-later';

export const purchaseNotificationId = (purchaseId: string) => `purchase:${purchaseId}`;

export type Invocation = { id: string; name: string; params: Record<string, unknown>; createdAt: number };

/** Hva et kall fra køen gjør med dataene. Ugyldige kall og kall som alt er gjort, endrer ingenting. */
export function applyInvocation(data: MoneyData, inv: Invocation): MoneyData {
  if (inv.name === INTENT_LOG) {
    const { amount, merchant } = inv.params;
    if (typeof amount !== 'string' || typeof merchant !== 'string') return data;
    return importPurchase(data, { id: inv.id, amountText: amount, merchant, at: new Date(inv.createdAt) });
  }
  if (inv.name === INTENT_CATEGORIZE) {
    const { purchaseId, categoryId } = inv.params;
    if (typeof purchaseId !== 'string' || typeof categoryId !== 'string') return data;
    return approveFromNotification(data, purchaseId, categoryId);
  }
  return data;
}

/** Forslaget er godkjent i varselet. Har kjøpet fått kategori i appen i mellomtiden, gjelder det. */
export function approveFromNotification(data: MoneyData, purchaseId: string, categoryId: string): MoneyData {
  const p = data.purchases.find((q) => q.id === purchaseId);
  if (!p || !isPending(p) || !categoryById(data, categoryId)) return data;
  return categorize(data, purchaseId, categoryId);
}

/** Det Swift legger i varselet (`userInfo`), som igjen blir `data` i expo-notifications. */
export type PurchaseNotificationData = {
  kind: 'purchase';
  purchaseId: string;
  amount: string;
  merchant: string;
  /** Millisekunder siden 1970. */
  at: number;
};

export function readNotificationData(data: unknown): PurchaseNotificationData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.kind !== 'purchase' || typeof d.purchaseId !== 'string') return null;
  if (typeof d.amount !== 'string' || typeof d.merchant !== 'string' || typeof d.at !== 'number') return null;
  return { kind: 'purchase', purchaseId: d.purchaseId, amount: d.amount, merchant: d.merchant, at: d.at };
}

/** Tar inn kjøpet fra varselet, i tilfelle køen ikke er lest ennå. */
export function importFromNotification(data: MoneyData, n: PurchaseNotificationData): MoneyData {
  return importPurchase(data, { id: n.purchaseId, amountText: n.amount, merchant: n.merchant, at: new Date(n.at) });
}

/** Kategori-ID-en i en varselkategori med forslag, ellers null. */
export function suggestedCategoryOf(notificationCategory: string | null | undefined): string | null {
  return notificationCategory?.startsWith(NOTIFICATION_SUGGEST) ? notificationCategory.slice(NOTIFICATION_SUGGEST.length) : null;
}

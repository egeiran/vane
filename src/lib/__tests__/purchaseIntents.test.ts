import { describe, expect, it } from '@jest/globals';

import { EMPTY_MONEY } from '../money';
import { categorize, updatePurchase } from '../moneyState';
import {
  applyInvocation,
  importFromNotification,
  INTENT_CATEGORIZE,
  INTENT_LOG,
  readNotificationData,
  suggestedCategoryOf,
} from '../purchaseIntents';

const at = new Date(2026, 9, 26, 14, 32).getTime();
const log = { id: 'inv1', name: INTENT_LOG, params: { amount: 'kr 149,00', merchant: 'REMA 1000' }, createdAt: at };

describe('køen fra Swift', () => {
  it('tar inn kjøpet én gang', () => {
    const d = applyInvocation(EMPTY_MONEY, log);
    expect(d.purchases).toHaveLength(1);
    expect(d.purchases[0]).toMatchObject({ id: 'inv1', amount: 14900, merchant: 'Rema 1000', time: '14:32' });
    expect(applyInvocation(d, log)).toBe(d);
  });

  it('godkjenner forslaget fra varselet, men overstyrer ikke det som er valgt i appen', () => {
    let d = applyInvocation(EMPTY_MONEY, log);
    const approve = { id: 'inv2', name: INTENT_CATEGORIZE, params: { purchaseId: 'inv1', categoryId: 'dagligvarer' }, createdAt: at };
    const approved = applyInvocation(d, approve);
    expect(approved.purchases[0].parts).toEqual([{ categoryId: 'dagligvarer', amount: 14900 }]);
    d = categorize(d, 'inv1', 'hjem');
    expect(applyInvocation(d, approve)).toBe(d);
    d = updatePurchase(applyInvocation(EMPTY_MONEY, log), 'inv1', { skipped: true });
    expect(applyInvocation(d, approve)).toBe(d);
  });

  it('lar ugyldige og ukjente kall være', () => {
    expect(applyInvocation(EMPTY_MONEY, { ...log, params: { amount: 149 } })).toBe(EMPTY_MONEY);
    expect(applyInvocation(EMPTY_MONEY, { ...log, name: 'noeAnnet' })).toBe(EMPTY_MONEY);
    const approveMissing = { id: 'x', name: INTENT_CATEGORIZE, params: { purchaseId: 'finnes-ikke', categoryId: 'hjem' }, createdAt: at };
    expect(applyInvocation(EMPTY_MONEY, approveMissing)).toBe(EMPTY_MONEY);
    const d = applyInvocation(EMPTY_MONEY, log);
    const unknownCategory = { id: 'y', name: INTENT_CATEGORIZE, params: { purchaseId: 'inv1', categoryId: 'borte' }, createdAt: at };
    expect(applyInvocation(d, unknownCategory)).toBe(d);
  });
});

describe('varselet', () => {
  const data = { kind: 'purchase', purchaseId: 'inv1', amount: 'kr 149,00', merchant: 'REMA 1000', at };

  it('tar inn kjøpet fra varselet, og køen gjør det ikke igjen', () => {
    const n = readNotificationData(data)!;
    const d = importFromNotification(EMPTY_MONEY, n);
    expect(d.purchases[0]).toMatchObject({ id: 'inv1', amount: 14900 });
    expect(applyInvocation(d, log)).toBe(d);
  });

  it('kjenner bare igjen kjøpsvarsler', () => {
    expect(readNotificationData({ kind: 'habit', habitId: 'x' })).toBeNull();
    expect(readNotificationData({ ...data, at: 'i går' })).toBeNull();
    expect(readNotificationData(null)).toBeNull();
  });

  it('leser kategorien i forslaget', () => {
    expect(suggestedCategoryOf('purchase-suggest:dagligvarer')).toBe('dagligvarer');
    expect(suggestedCategoryOf('purchase-new')).toBeNull();
    expect(suggestedCategoryOf(undefined)).toBeNull();
  });
});

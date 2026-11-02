import { describe, expect, it } from '@jest/globals';

import { EMPTY_MONEY, nativePurchaseConfig } from '../money';
import { importPurchase } from '../moneyState';
import { loadData, updateSettings } from '../state';
import { DEFAULT_SETTINGS, EMPTY_DATA } from '../types';
import { buildPengerProps } from '../widgetProps';

describe('moduler', () => {
  it('har Penger på for alle som brukte appen før moduler fantes', () => {
    const old = { habits: [], logs: {}, goals: {}, goalsSkipped: {}, settings: { morningEnabled: false, morningTime: '06:30', remindersEnabled: true } };
    const data = loadData(old);
    expect(data.settings.modules).toEqual({ money: true, journal: false, health: false, recurring: false });
    expect(data.settings.morningTime).toBe('06:30');
    expect(data.settings.weekStart).toBeNull();
  });

  it('fyller inn moduler som mangler, og beholder valget', () => {
    const data = loadData({ ...EMPTY_DATA, settings: { ...DEFAULT_SETTINGS, modules: { money: false } } });
    expect(data.settings.modules).toEqual({ money: false, journal: false, health: false, recurring: false });
  });

  it('gir en ny installasjon Penger på', () => {
    expect(loadData(undefined).settings.modules.money).toBe(true);
  });

  it('sletter ingenting når Penger slås av og på igjen', () => {
    const before = loadData({ ...EMPTY_DATA, logs: { '2026-11-04': { h: 1 } } });
    const off = updateSettings(before, { modules: { ...before.settings.modules, money: false } });
    const on = updateSettings(off, { modules: { ...off.settings.modules, money: true } });
    expect(off.settings.modules.money).toBe(false);
    expect(on).toEqual(before);
  });

  it('sier fra til Swift at det ikke skal sendes kjøpsvarsel når Penger er av', () => {
    expect(nativePurchaseConfig(EMPTY_MONEY).enabled).toBe(true);
    expect(nativePurchaseConfig(EMPTY_MONEY, false).enabled).toBe(false);
  });

  it('tar inn kjøp uten å se på modulene, så køen fra Snarveier tømmes også når Penger er av', () => {
    // importPurchase og applyInvocation får bare pengedataene. Modulen styrer varsler og visning,
    // aldri om et kjøp lagres (se takeInvocations i purchases.ts).
    const d = importPurchase(EMPTY_MONEY, { id: 'a', amountText: '149', merchant: 'Rema', at: new Date(2026, 10, 4) });
    expect(d.purchases).toHaveLength(1);
  });

  it('viser «slått av» i Penger-widgeten, uten tall', () => {
    expect(buildPengerProps(3, false)).toMatchObject({ waiting: 0, enabled: false });
    expect(buildPengerProps(3, false).text.off).toBe('Penger er slått av i Vane');
    expect(buildPengerProps(3)).toMatchObject({ waiting: 3, enabled: true });
  });
});

import { describe, expect, it } from '@jest/globals';

import { periodEnd, periodsBack, weekRows } from '../grid';

describe('perioder i Oversikt', () => {
  const today = '2026-11-13'; // fredag

  it('periode 0 slutter i dag, eldre perioder ligger rett før hverandre', () => {
    expect(periodEnd(today, 4, 0)).toBe(today);
    const rows0 = weekRows(periodEnd(today, 4, 0), 4);
    const rows1 = weekRows(periodEnd(today, 4, 1), 4);
    expect(rows0[0][0]).toBe('2026-10-19');
    expect(rows1[3][6]).toBe('2026-10-18'); // siste dag i forrige periode er dagen før
    expect(rows1[0][0]).toBe('2026-09-21');
    expect(weekRows(periodEnd(today, 1, 2), 1)[0][0]).toBe('2026-10-26');
  });

  it('kan bla tilbake til perioden der første dag ligger', () => {
    expect(periodsBack(today, today, 4)).toBe(0);
    expect(periodsBack('2026-11-09', today, 1)).toBe(0); // samme uke
    expect(periodsBack('2026-11-08', today, 1)).toBe(1);
    expect(periodsBack('2026-10-19', today, 4)).toBe(0); // første uke i perioden som slutter i dag
    expect(periodsBack('2026-10-18', today, 4)).toBe(1);
    expect(periodsBack('2025-01-01', today, 53)).toBe(1);
  });
});

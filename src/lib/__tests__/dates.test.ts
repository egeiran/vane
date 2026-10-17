import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  daysBetween,
  formatLong,
  formatShort,
  isoWeek,
  relativeDayName,
  shiftTime,
  startOfWeek,
  weekdayIndex,
} from '../dates';

describe('dates', () => {
  it('regner ukedag med mandag som første dag', () => {
    expect(weekdayIndex('2026-10-12')).toBe(0); // mandag
    expect(weekdayIndex('2026-10-17')).toBe(5); // lørdag
    expect(weekdayIndex('2026-10-18')).toBe(6); // søndag
  });

  it('legger til dager over månedsskifte og sommertid', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('teller dager mellom datoer', () => {
    expect(daysBetween('2026-10-16', '2026-10-17')).toBe(1);
    expect(daysBetween('2026-10-17', '2026-10-17')).toBe(0);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('finner mandagen i uka', () => {
    expect(startOfWeek('2026-10-17')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
  });

  it('regner ISO-ukenummer', () => {
    expect(isoWeek('2026-10-17')).toBe(42);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2025-12-29')).toBe(1);
    expect(isoWeek('2027-01-03')).toBe(53);
  });

  it('formaterer på norsk', () => {
    expect(formatLong('2026-10-17')).toBe('Lørdag 17. oktober');
    expect(formatShort('2026-09-21')).toBe('21. sep');
    expect(relativeDayName('2026-10-17', '2026-10-17')).toBe('I dag');
    expect(relativeDayName('2026-10-16', '2026-10-17')).toBe('I går');
    expect(relativeDayName('2026-10-09', '2026-10-17')).toBe('Fredag 9. oktober');
  });

  it('flytter klokkeslett innenfor døgnet', () => {
    expect(shiftTime('07:00', 15)).toBe('07:15');
    expect(shiftTime('07:00', -15)).toBe('06:45');
    expect(shiftTime('00:00', -15)).toBe('00:00');
    expect(shiftTime('23:45', 15)).toBe('23:45');
  });
});

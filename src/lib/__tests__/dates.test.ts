import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  daysBetween,
  dayWhen,
  formatLong,
  formatShort,
  inlineDayName,
  isoWeek,
  pickedDay,
  firstDay,
  daysFrom,
  weekStarts,
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

  it('valgt dag: fra den første dagen til i dag, resten blir i dag', () => {
    const today = '2026-11-13';
    expect(pickedDay(null, today)).toBe(today);
    expect(pickedDay('2026-11-12', today)).toBe('2026-11-12');
    expect(pickedDay('2026-11-11', today)).toBe(today); // uten `first`: bare i går
    expect(pickedDay('2026-10-01', today, '2026-09-30')).toBe('2026-10-01');
    expect(pickedDay('2026-09-29', today, '2026-09-30')).toBe(today); // før første dag
    expect(pickedDay('2026-11-14', today, '2026-09-30')).toBe(today); // i morgen
  });

  it('første dag med data er den eldste, men aldri senere enn i går', () => {
    const today = '2026-11-13';
    expect(firstDay([], today)).toBe('2026-11-12');
    expect(firstDay(['2026-11-13'], today)).toBe('2026-11-12');
    expect(firstDay(['2026-11-01', '2026-10-15', '2026-11-10'], today)).toBe('2026-10-15');
    expect(firstDay(['tull', '2026-10-15'], today)).toBe('2026-10-15');
  });

  it('dagene og ukene fra første dag til i dag', () => {
    expect(daysFrom('2026-11-11', '2026-11-13')).toEqual(['2026-11-11', '2026-11-12', '2026-11-13']);
    expect(daysFrom('2026-11-13', '2026-11-13')).toEqual(['2026-11-13']);
    // Fredag 13. november, første dag onsdag 28. oktober: ukene fra mandag 26. oktober.
    expect(weekStarts('2026-10-28', '2026-11-13', 'mon')).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(weekStarts('2026-10-28', '2026-11-13', 'sun')).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
    // Over 25. oktober (slutt på sommertid i Norge) blir det fortsatt hele uker.
    expect(weekStarts('2026-10-20', '2026-10-27', 'mon')).toEqual(['2026-10-19', '2026-10-26']);
  });

  it('i dag og i går kan endres, eldre dager bare leses', () => {
    const today = '2026-11-13';
    expect(dayWhen(today, today)).toBe('today');
    expect(dayWhen('2026-11-12', today)).toBe('yesterday');
    expect(dayWhen('2026-11-10', today)).toBe('older');
    expect(inlineDayName(today, today)).toBe('i dag');
    expect(inlineDayName('2026-11-12', today)).toBe('i går');
    expect(inlineDayName('2026-11-10', today)).toBe('tirsdag');
  });
});

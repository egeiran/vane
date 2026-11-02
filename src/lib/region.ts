import { getCalendars, getLocales } from 'expo-localization';
import { Platform } from 'react-native';

import { getLang } from '@/i18n';

import { displayTime, type WeekStart } from './dates';
import type { Settings } from './types';

/**
 * Det telefonen sier om valuta, ukestart og klokke. Valuta og ukestart kan endres i appen
 * (`Settings.weekStart`, `MoneyData.currency`); klokka følger alltid telefonen.
 *
 * Leses én gang når appen starter. Endres noe her mens appen kjører, gjelder det neste gang den
 * startes. Ukestart og valuta som brukeren har valgt, sendes inn som parametere der de brukes, så
 * skjermene oppdaterer seg med en gang.
 */
export type DeviceRegion = { currency: string; weekStart: WeekStart; clock24: boolean };

export const NORWEGIAN_REGION: DeviceRegion = { currency: 'NOK', weekStart: 'mon', clock24: true };

/**
 * Regionen ut fra expo-localization. På iOS er `firstWeekday` 1 for søndag og 2 for mandag. På web
 * gir expo-localization ISO-tall (1 for mandag, 7 for søndag) og ingen valuta.
 */
export function regionFrom(
  locale: { currencyCode: string | null } | undefined,
  calendar: { firstWeekday: number | null; uses24hourClock: boolean | null } | undefined,
  platform: string
): DeviceRegion {
  const sunday = platform === 'web' ? 7 : 1;
  return {
    currency: locale?.currencyCode?.toUpperCase() || 'NOK',
    weekStart: calendar?.firstWeekday === sunday ? 'sun' : 'mon',
    clock24: calendar?.uses24hourClock ?? true,
  };
}

function read(): DeviceRegion {
  try {
    return regionFrom(getLocales()[0], getCalendars()[0], Platform.OS);
  } catch {
    return NORWEGIAN_REGION;
  }
}

let device = read();

export const getDeviceRegion = (): DeviceRegion => device;

/** Brukes i tester. */
export function setDeviceRegion(region: DeviceRegion) {
  device = region;
}

/** Uka starter på mandag eller søndag: det brukeren har valgt, ellers det telefonen bruker. */
export function weekStartOf(settings: Pick<Settings, 'weekStart'>): WeekStart {
  return settings.weekStart ?? device.weekStart;
}

/** Et lagret klokkeslett ('HH:MM') slik telefonen viser klokka: «18:00» eller «6:00 PM». */
export function showTime(value: string): string {
  return displayTime(value, device.clock24);
}

/** Ukenummer brukes i Norge, men ikke der uka starter på søndag eller på engelsk. */
export function showsWeekNumber(weekStart: WeekStart): boolean {
  return getLang() === 'nb' && weekStart === 'mon';
}

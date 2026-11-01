import type { Strings } from '@/i18n';

/**
 * Data widgetene får fra appen. Fargene og teksten sendes med, fordi widget-koden ikke kan
 * importere noe. Ingen felt kan være `null` eller `undefined`: iOS kan ikke lagre det, og da feiler
 * hele sendingen.
 */

export type WidgetColors = { solid: string; soft: string; ink: string };

export type TodayWidgetItem = {
  id: string;
  name: string;
  kind: 'check' | 'count';
  target: number;
  value: number;
  /** Ukentlige vaner vises bare i den store widgeten og teller ikke med i «2 av 5». */
  weekly: boolean;
  /** Påminnelsen ('HH:MM'), eller '' uten påminnelse. Vaner med påminnelse tas først, etter klokkeslett. */
  time: string;
  /** Påminnelsen slik telefonen viser klokka: «18:00» eller «6:00 PM». '' uten påminnelse. */
  timeLabel: string;
  /** «glass» i «5 av 8 glass». */
  unit: string;
  light: WidgetColors;
  dark: WidgetColors;
};

export type TodayWidgetGoal = { id: string; text: string; done: boolean };

/** Teksten på telefonens språk. Tekst med tall er maler med {navn} som widgeten fyller inn. */
export type TodayWidgetText = Strings['widgets']['today'];
export type PengerWidgetText = Strings['widgets']['money'];

export type TodayWidgetProps = {
  /** Dagen innholdet gjelder ('YYYY-MM-DD'). Appen leser det tilbake for å fange opp trykk. */
  day: string;
  items: TodayWidgetItem[];
  goals: TodayWidgetGoal[];
  /** Ingen mål satt ennå om morgenen: widgeten spør «Hva vil du få til i dag?». */
  goalPrompt: boolean;
  hasHabits: boolean;
  /** Kjøp som venter på kategori. Vises som et lite merke i hjørnet når det er noen. */
  waiting: number;
  text: TodayWidgetText;
};

/**
 * «Penger» på hjemskjermen. Swift-koden i app-intents/ teller `waiting` opp og ned i oppslaget
 * når kjøp kommer inn eller godkjennes i varselet uten at appen kjører.
 */
export type PengerWidgetProps = {
  waiting: number;
  /** Penger er slått på. Er den av, sier widgeten det, uten knapp. */
  enabled: boolean;
  text: PengerWidgetText;
};

/**
 * Låseskjermen har tre tilstander:
 * - `goals`: dagens mål finnes – vis første uferdige mål
 * - `prompt`: morgen uten mål – inviter til å sette ett (trykk åpner målskjermen)
 * - `habits`: ellers – vis det som er igjen av vanene
 */
export type LockWidgetMode = 'goals' | 'prompt' | 'habits';

export type LockWidgetProps = {
  day: string;
  mode: LockWidgetMode;
  /** Daglige vaner gjort og totalt, til ringen. */
  done: number;
  total: number;
  /** Hovedlinja ved siden av ringen: «Rydde boden», «2 igjen», «Sett dagens mål». */
  main: string;
  /** Linja under: «1 av 2 mål», «Lese, Skjermfri kveld». */
  sub: string;
  inline: string;
  /** Ordet under sola i den runde varianten om morgenen: «Mål». */
  short: string;
  url: string;
};

/**
 * Data widgetene får fra appen. Fargene sendes med, fordi widget-koden ikke kan importere noe.
 * Ingen felt kan være `null` eller `undefined`: iOS kan ikke lagre det, og da feiler hele sendingen.
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
  /** «glass» i «5 av 8 glass». */
  unit: string;
  light: WidgetColors;
  dark: WidgetColors;
};

export type TodayWidgetGoal = { id: string; text: string; done: boolean };

export type TodayWidgetProps = {
  /** Dagen innholdet gjelder ('YYYY-MM-DD'). Appen leser det tilbake for å fange opp trykk. */
  day: string;
  items: TodayWidgetItem[];
  goals: TodayWidgetGoal[];
  /** Ingen mål satt ennå om morgenen: widgeten spør «Hva vil du få til i dag?». */
  goalPrompt: boolean;
  hasHabits: boolean;
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
  url: string;
};

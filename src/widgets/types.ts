/** Data widgetene får fra appen. Fargene sendes med, fordi widget-koden ikke kan importere noe. */

export type WidgetColors = { solid: string; soft: string; ink: string };

export type TodayWidgetItem = {
  id: string;
  name: string;
  kind: 'check' | 'count';
  target: number;
  value: number;
  light: WidgetColors;
  dark: WidgetColors;
};

export type TodayWidgetProps = {
  /** Dagen innholdet gjelder ('YYYY-MM-DD'). Appen leser det tilbake for å fange opp trykk. */
  day: string;
  items: TodayWidgetItem[];
  /** Ingen mål satt (og ikke svart «Ikke i dag»): vis en lenke for å sette mål. */
  goalPrompt: boolean;
  /** «Ringe bestemor + 1 til · 0 av 2», eller tom når det ikke finnes mål. */
  goalLine: string;
  hasHabits: boolean;
};

/**
 * Låseskjermen har tre tilstander:
 * - `goals`: dagens mål finnes – vis målet
 * - `prompt`: morgen uten mål – inviter til å sette ett (trykk åpner målskjermen)
 * - `habits`: resten av dagen uten mål – vis neste vane i stedet
 */
export type LockWidgetMode = 'goals' | 'prompt' | 'habits';

export type LockWidgetProps = {
  day: string;
  mode: LockWidgetMode;
  done: number;
  total: number;
  title: string;
  line: string;
  detail: string;
  inline: string;
  url: string;
};

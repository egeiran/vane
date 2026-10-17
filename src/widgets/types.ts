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
  goalsDone: number;
  goalsTotal: number;
  hasHabits: boolean;
};

export type LockWidgetProps = {
  day: string;
  done: number;
  total: number;
  goalText: string;
  goalsDone: number;
  goalsTotal: number;
};

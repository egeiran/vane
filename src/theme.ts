import { useColorScheme } from 'react-native';

import type { ColorKey } from './lib/types';

export type HabitColor = {
  label: string;
  /** Fylt rute / avhuket sirkel (≥3:1 mot hvitt). */
  solid: string;
  /** Svak bakgrunn for rader som er gjort. */
  soft: string;
  /** Tekst oppå `soft`. */
  ink: string;
};

const LIGHT_COLORS: Record<ColorKey, HabitColor> = {
  salvie: { label: 'Salvie', solid: '#6F9A68', soft: '#E3ECDF', ink: '#35552F' },
  himmel: { label: 'Himmel', solid: '#5F8DB8', soft: '#DFE8F1', ink: '#2A4D70' },
  lavendel: { label: 'Lavendel', solid: '#8B7BBE', soft: '#E8E3F2', ink: '#4B3C7D' },
  fersken: { label: 'Fersken', solid: '#C7835A', soft: '#F5E4D8', ink: '#7A3F1C' },
  sand: { label: 'Sand', solid: '#AE9142', soft: '#F1EAD3', ink: '#5E4C14' },
  rose: { label: 'Rose', solid: '#C27383', soft: '#F3E1E4', ink: '#7A2E3E' },
  skifer: { label: 'Skifer', solid: '#7D8590', soft: '#E6E8EB', ink: '#3A4049' },
};

const DARK_COLORS: Record<ColorKey, HabitColor> = {
  salvie: { label: 'Salvie', solid: '#7FAA78', soft: '#243022', ink: '#B9D3B3' },
  himmel: { label: 'Himmel', solid: '#6F9BC6', soft: '#1F2A36', ink: '#B3CBE3' },
  lavendel: { label: 'Lavendel', solid: '#9A8BCB', soft: '#2A2538', ink: '#CDC3EA' },
  fersken: { label: 'Fersken', solid: '#D08F67', soft: '#36261C', ink: '#EBC3A8' },
  sand: { label: 'Sand', solid: '#BCA052', soft: '#332D1A', ink: '#E0D09E' },
  rose: { label: 'Rose', solid: '#CC8190', soft: '#36222A', ink: '#E9BCC6' },
  skifer: { label: 'Skifer', solid: '#8E96A1', soft: '#262A30', ink: '#C3C9D1' },
};

/** Fargene en vane kan få. */
export const COLOR_KEYS: ColorKey[] = ['salvie', 'himmel', 'lavendel', 'fersken', 'sand', 'rose'];
/** Kategorier kan også være grå. */
export const CATEGORY_COLOR_KEYS: ColorKey[] = [...COLOR_KEYS, 'skifer'];

const LIGHT = {
  dark: false,
  bg: '#F6F6F3',
  card: '#FFFFFF',
  text: '#1C1C1E',
  sub: '#6A6A6F',
  faint: '#A3A3A7',
  button: '#EAEAE5',
  field: '#F2F2EE',
  segment: '#EAEAE5',
  segmentOn: '#FFFFFF',
  hair: '#ECECE8',
  border: '#DCDCD7',
  empty: '#E9E9E4',
  none: '#F3F3EF',
  slate: '#2B3440',
  inverse: '#1C1C1E',
  onInverse: '#FFFFFF',
  danger: '#A1281F',
  switchOn: '#6F9A68',
  colors: LIGHT_COLORS,
};

const DARK: typeof LIGHT = {
  dark: true,
  bg: '#111112',
  card: '#1C1C1E',
  text: '#F2F2F0',
  sub: '#A1A1A6',
  faint: '#6A6A6F',
  button: '#2A2A2D',
  field: '#2A2A2D',
  segment: '#2A2A2D',
  segmentOn: '#48484C',
  hair: '#2C2C2F',
  border: '#3A3A3D',
  empty: '#2A2A2D',
  none: '#1F1F21',
  slate: '#C9D3DE',
  inverse: '#F2F2F0',
  onInverse: '#111112',
  danger: '#FF8A80',
  switchOn: '#7FAA78',
  colors: DARK_COLORS,
};

export type Theme = typeof LIGHT;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

export function getTheme(dark: boolean): Theme {
  return dark ? DARK : LIGHT;
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}

/**
 * Fargestyrke for rutenett: null = gjaldt ikke, 0 = ikke gjort, ellers sterkere jo mer som er gjort.
 */
export function shade(theme: Theme, hex: string, fraction: number | null): string {
  if (fraction === null) return theme.none;
  if (fraction <= 0) return theme.empty;
  return hexToRgba(hex, 0.25 + 0.75 * Math.min(fraction, 1));
}

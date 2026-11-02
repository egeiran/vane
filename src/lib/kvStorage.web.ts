import type { StateStorage } from 'zustand/middleware';

/**
 * Bare for å kjøre appen i nettleseren, til skjermbilder og testing (Vane er ikke en web-app).
 * `expo-sqlite` trenger egne headere og Metro-oppsett på web, så her brukes `localStorage`.
 * Det gjør det også enkelt å legge inn testdata før appen starter.
 */
export const kvStorage: StateStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

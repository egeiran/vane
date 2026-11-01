/**
 * Widgetene finnes ikke i nettleseren. `widgetSync.ts` importerer widget-layoutene, som bruker
 * `@expo/ui/swift-ui` og krasjer på web, så web får disse tomme variantene.
 * Bare for å kjøre appen i nettleseren, til skjermbilder og testing.
 */
export function syncWidgets(): Promise<void> {
  return Promise.resolve();
}

export function scheduleSyncWidgets() {}

export function listenToWidgetTaps() {
  return () => {};
}

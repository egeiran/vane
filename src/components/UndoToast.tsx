import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { tr } from '@/i18n';
import { useTheme } from '@/theme';

import { tick } from './ui';

type Undo = { id: number; text: string; undo: () => void };

const useUndoState = create<{ current: Undo | null }>(() => ({ current: null }));
let nextId = 1;

/** Så lenge «Angre» står fremme. */
const SHOW_MS = 5000;

/**
 * Viser «Slettet Kiwi · Angre» nederst i noen sekunder, i stedet for å spørre før man sletter (som
 * Mail). En ny melding erstatter den forrige; den forrige slettingen står da.
 */
export function showUndo(text: string, undo: () => void) {
  useUndoState.setState({ current: { id: nextId++, text, undo } });
  AccessibilityInfo.announceForAccessibility(text);
}

/** Meldingen selv. Ligger øverst i appen (`_layout.tsx`), over fanelinja. */
export function UndoToast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useUndoState((s) => s.current);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => useUndoState.setState((s) => (s.current?.id === current.id ? { current: null } : s)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 76 }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOut.duration(140)}
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: t.inverse }]}>
        <Text style={[styles.text, { color: t.onInverse }]} numberOfLines={1}>
          {current.text}
        </Text>
        <Pressable
          onPress={() => {
            tick();
            current.undo();
            useUndoState.setState({ current: null });
          }}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.undo, { color: t.onInverse }]}>{tr.common.undo}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    minHeight: 48,
    maxWidth: 480,
    alignSelf: 'stretch',
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
  },
  text: { flex: 1, fontSize: 15, fontWeight: '500' },
  undo: { fontSize: 15, fontWeight: '700' },
});

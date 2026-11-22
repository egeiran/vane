import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type LegacyPanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tr } from '@/i18n';
import { useTheme } from '@/theme';

import { Icon } from './Icon';

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** Alle radene har samme høyde. */
  rowHeight: number;
  /** Endre-modus: håndtaket (≡) vises, og man drar i det. */
  editing: boolean;
  onMove: (id: string, to: number) => void;
  /** Raden. `handle` er håndtaket, som raden legger til høyre (det er `null` utenfor Endre-modus). */
  renderRow: (item: T, handle: ReactNode) => ReactNode;
};

/**
 * En liste man endrer rekkefølgen på ved å dra, som i Påminnelser: hold inne på en rad og dra den,
 * eller trykk Endre og dra i håndtaket. De andre radene glir unna, og det kommer et lett tikk når
 * raden løftes og når den passerer en plass. Rekkefølgen lagres når raden slippes.
 */
export function SortableList<T>({ items, keyOf, rowHeight, editing, onMove, renderRow }: Props<T>) {
  const t = useTheme();
  const ids = items.map(keyOf);
  const order = ids.join('|');
  const positions = useSharedValue<Record<string, number>>(Object.fromEntries(ids.map((id, i) => [id, i])));

  // Ny rekkefølge fra lagringen (eller en ny rad): plassene følger lista.
  useEffect(() => {
    positions.set(Object.fromEntries(order.split('|').map((id, i) => [id, i])));
  }, [order, positions]);

  return (
    <View style={{ height: ids.length * rowHeight }}>
      {items.map((item, i) => (
        <SortableRow key={ids[i]} id={ids[i]} index={i} count={ids.length} height={rowHeight} positions={positions} editing={editing} onMove={onMove}>
          {(handle) => renderRow(item, handle)}
        </SortableRow>
      ))}
      {/* Skillelinjene står fast mellom plassene, så de ikke flytter seg med radene. */}
      {ids.slice(1).map((id, i) => (
        <View key={id} pointerEvents="none" style={[styles.separator, { top: (i + 1) * rowHeight, backgroundColor: t.separator }]} />
      ))}
    </View>
  );
}

const lift = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const step = () => Haptics.selectionAsync().catch(() => {});

function SortableRow({
  id,
  index,
  count,
  height,
  positions,
  editing,
  onMove,
  children,
}: {
  id: string;
  index: number;
  count: number;
  height: number;
  positions: SharedValue<Record<string, number>>;
  editing: boolean;
  onMove: (id: string, to: number) => void;
  children: (handle: ReactNode) => ReactNode;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const active = useSharedValue(false);
  const y = useSharedValue(index * height);
  const start = useSharedValue(0);
  const drop = (to: number) => onMove(id, to);

  const configure = (g: LegacyPanGesture) =>
    g
      .onStart(() => {
        'worklet';
        active.set(true);
        start.set((positions.get()[id] ?? 0) * height);
        y.set(start.get());
        scheduleOnRN(lift);
      })
      .onUpdate((e) => {
        'worklet';
        y.set(start.get() + e.translationY);
        const p = positions.get();
        const from = p[id];
        const to = Math.max(0, Math.min(count - 1, Math.round(y.get() / height)));
        if (to === from) return;
        const next: Record<string, number> = {};
        for (const k of Object.keys(p)) {
          const v = p[k];
          next[k] = k === id ? to : from < to && v > from && v <= to ? v - 1 : from > to && v >= to && v < from ? v + 1 : v;
        }
        positions.set(next);
        scheduleOnRN(step);
      })
      .onEnd(() => {
        'worklet';
        scheduleOnRN(drop, positions.get()[id] ?? 0);
      })
      .onFinalize(() => {
        'worklet';
        active.set(false);
      });

  // Hold inne og dra hvor som helst på raden. Et vanlig trykk går til knappene i raden som før.
  const holdPan = configure(Gesture.Pan().activateAfterLongPress(300));
  // I Endre-modus: dra i håndtaket med en gang.
  const handlePan = configure(Gesture.Pan().minDistance(0));

  const style = useAnimatedStyle(() => {
    const slot = (positions.get()[id] ?? index) * height;
    if (active.get()) return { transform: [{ translateY: y.get() }, { scale: 1.02 }], zIndex: 10, shadowOpacity: 0.16 };
    return { transform: [{ translateY: reduced ? slot : withTiming(slot, { duration: 200 }) }, { scale: 1 }], zIndex: 0, shadowOpacity: 0 };
  });

  const handle = editing ? (
    <GestureDetector gesture={handlePan}>
      <View style={styles.handle} accessibilityRole="adjustable" accessibilityLabel={tr.common.dragToMove}>
        <Icon name="line.3.horizontal" size={18} color={t.faint} />
      </View>
    </GestureDetector>
  ) : null;

  return (
    <GestureDetector gesture={holdPan}>
      <Animated.View style={[styles.row, { height, backgroundColor: t.card }, style]}>{children(handle)}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, top: 0, shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, borderRadius: 12 },
  separator: { position: 'absolute', left: 14, right: 0, height: StyleSheet.hairlineWidth, zIndex: 1 },
  handle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

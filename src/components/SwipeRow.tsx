import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { tick } from './ui';

export type SwipeAction = { label: string; color: string; onPress: () => void };

/**
 * Sveip en rad mot venstre for knapper bak den (Slett, Flytt), som i Mail. Knappene må trykkes; et
 * langt sveip gjør ingenting av seg selv, så ingenting slettes ved et uhell. Raden selv må ha
 * bakgrunnsfarge, så knappene er skjult til man sveiper.
 */
export function SwipeRow({ actions, enabled = true, children }: { actions: SwipeAction[]; enabled?: boolean; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  if (!enabled || !actions.length) return children;
  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableWillOpen={() => tick()}
      renderRightActions={() => (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                ref.current?.close();
                a.onPress();
              }}
              style={({ pressed }) => [styles.action, { backgroundColor: a.color, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={styles.label}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: { width: 78, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

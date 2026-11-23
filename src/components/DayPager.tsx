import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type FlatList as RNFlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
// Gesture Handler sin liste, så sveip på en rad (SwipeRow) og bladingen ikke slåss om samme drag.
import { FlatList } from 'react-native-gesture-handler';

import type { DateKey } from '@/lib/dates';

import { hexToRgba, useTheme } from '@/theme';

import { tick } from './ui';

type Props = {
  /** Alle dagene man kan bla mellom, eldst først. Siste er i dag. */
  days: DateKey[];
  day: DateKey;
  onChange: (day: DateKey) => void;
  /** Innholdet for én dag, med sin egen loddrette ScrollView. */
  renderDay: (day: DateKey) => ReactNode;
};

/**
 * Innholdet på I dag og Mat, én side per dag: dra sidelengs for forrige eller neste dag, som å bla i
 * Kalender. Det er iOS sin egen bla-fysikk (en vannrett FlatList med `pagingEnabled`), så den følger
 * fingeren og stopper mykt ved første dag og ved i dag. Et lett tikk når dagen byttes.
 *
 * Dagen velges også utenfra (ukestripa, «I dag»): da blar den dit, med animasjon til nabodagen og
 * uten animasjon over lengre hopp.
 */
export function DayPager({ days, day, onChange, renderDay }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const list = useRef<RNFlatList<DateKey>>(null);
  const index = Math.max(0, days.indexOf(day));
  // Siden som ligger i ro. Oppdateres når bladingen stopper, og når dagen velges utenfra.
  const shown = useRef(index);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (Math.abs(x - i * width) > 1 || i === shown.current) return;
    shown.current = i;
    const next = days[i];
    if (next && next !== day) {
      tick();
      onChange(next);
    }
  };

  useEffect(() => {
    if (!width || shown.current === index) return;
    const near = Math.abs(shown.current - index) === 1;
    shown.current = index;
    list.current?.scrollToIndex({ index, animated: near });
  }, [index, width]);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {width ? (
        <FlatList
          ref={list}
          key={width}
          data={days}
          keyExtractor={(d) => d}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          // Dagen settes når bladingen har stoppet. På web finnes ikke momentum-hendelsen, så der
          // brukes rullingen (en side ligger i ro når den står helt på plass).
          onMomentumScrollEnd={process.env.EXPO_OS === 'web' ? undefined : settle}
          onScroll={process.env.EXPO_OS === 'web' ? settle : undefined}
          scrollEventThrottle={process.env.EXPO_OS === 'web' ? 16 : undefined}
          renderItem={({ item }) => <View style={{ width, flex: 1 }}>{renderDay(item)}</View>}
        />
      ) : null}
      {/* Kanten under ukestripa: en hårlinje, som i Kalender, og en myk toning, så innholdet som
          rulles opp, går tydelig inn under stripa i stedet for å bli kuttet. */}
      <View
        pointerEvents="none"
        style={[
          styles.edge,
          { borderTopColor: t.separator, backgroundImage: `linear-gradient(to bottom, ${hexToRgba(t.bg, 1)}, ${hexToRgba(t.bg, 0)})` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 14, borderTopWidth: StyleSheet.hairlineWidth },
});

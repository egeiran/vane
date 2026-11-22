import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import type { DateKey } from '@/lib/dates';

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
  const [width, setWidth] = useState(0);
  const list = useRef<FlatList<DateKey>>(null);
  const index = Math.max(0, days.indexOf(day));
  // Siden som ligger i ro. Oppdateres når bladingen stopper, og når dagen velges utenfra.
  const shown = useRef(index);

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
          // Når bladingen har stoppet på en side (også på web, der det ikke finnes momentum-hendelser).
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const i = Math.round(x / width);
            if (Math.abs(x - i * width) > 1 || i === shown.current) return;
            shown.current = i;
            const next = days[i];
            if (next && next !== day) {
              tick();
              onChange(next);
            }
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => <View style={{ width, flex: 1 }}>{renderDay(item)}</View>}
        />
      ) : null}
    </View>
  );
}

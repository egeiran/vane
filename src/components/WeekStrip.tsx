import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { tr } from '@/i18n';
import { addDays, compareKeys, fromKey, relativeDayName, startOfWeek, weekdayIndex, weekStarts, type DateKey, type WeekStart } from '@/lib/dates';
import { dayStats } from '@/lib/habits';
import { useData } from '@/lib/store';
import { hexToRgba, useTheme } from '@/theme';

type Props = {
  today: DateKey;
  selected: DateKey;
  /** Den første dagen man kan bla til. Dager før er grå. */
  first: DateKey;
  weekStart: WeekStart;
  onSelect: (day: DateKey) => void;
  /** Hvor sterk prikken under dagen er, 0–1. Uten den: hvor mye av vanene og målene som ble gjort. */
  dot?: (day: DateKey) => number | null;
};

const CIRCLE = 44;
const PAD = 10;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * Ukestripa: én uke om gangen (mandag–søndag eller søndag–lørdag, etter ukestart), som i Kalender.
 * Dra sidelengs for forrige uke, trykk på en dag for å åpne den. Markøren glir til dagen som er valgt,
 * og stripa blar selv til uka når dagen byttes med sveip i innholdet. Alle dagene fra `first` kan
 * leses; bare i dag og i går kan endres (det sjekker skjermene selv). Dager fram i tid er grå.
 */
export function WeekStrip({ today, selected, first, weekStart, onSelect, dot }: Props) {
  const [width, setWidth] = useState(0);
  const weeks = weekStarts(first, today, weekStart);
  const selWeek = Math.max(0, weeks.indexOf(startOfWeek(selected, weekStart)));
  const list = useRef<FlatList<DateKey>>(null);
  const shownWeek = useRef(selWeek);

  // Byttes dagen til en annen uke (sveip i innholdet, eller «I dag»), blar stripa dit.
  useEffect(() => {
    if (!width || shownWeek.current === selWeek) return;
    shownWeek.current = selWeek;
    list.current?.scrollToIndex({ index: selWeek, animated: true });
  }, [selWeek, width]);

  return (
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={styles.wrap}>
      {width ? (
        <FlatList
          ref={list}
          key={width}
          data={weeks}
          keyExtractor={(w) => w}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          initialScrollIndex={selWeek}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          windowSize={3}
          initialNumToRender={1}
          onScroll={(e) => {
            // Uka man har bladd til. Stripa blar ikke tilbake av seg selv før dagen byttes.
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (Math.abs(e.nativeEvent.contentOffset.x - i * width) < 1) shownWeek.current = i;
          }}
          scrollEventThrottle={32}
          renderItem={({ item }) => (
            <Week start={item} width={width} today={today} selected={selected} first={first} onSelect={onSelect} dot={dot} />
          )}
        />
      ) : (
        <View style={{ height: 72 }} />
      )}
    </View>
  );
}

function Week({ start, width, today, selected, first, onSelect, dot }: Omit<Props, 'weekStart'> & { start: DateKey; width: number }) {
  const t = useTheme();
  const data = useData();
  const reduced = useReducedMotion();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const col = (width - PAD * 2) / 7;
  const selIndex = days.indexOf(selected);

  return (
    <View style={[styles.week, { width }]}>
      {selIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              backgroundColor: t.inverse,
              transform: [{ translateX: PAD + col * selIndex + (col - CIRCLE) / 2 }],
              transitionProperty: 'transform',
              transitionDuration: reduced ? 0 : 260,
              transitionTimingFunction: EASE_OUT,
            },
          ]}
        />
      ) : null}
      {days.map((day) => {
        const future = compareKeys(day, today) > 0;
        const before = compareKeys(day, first) < 0;
        const off = future || before;
        const isSel = day === selected;
        const isToday = day === today;
        const avg = off ? null : dot ? dot(day) : dayStats(data, day).average;
        return (
          <View key={day} style={[styles.day, { width: col }]}>
            <Text style={[styles.letter, { color: t.sub }]}>{tr.dates.weekdayLetters[weekdayIndex(day)]}</Text>
            <Pressable
              disabled={off}
              onPress={() => onSelect(day)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel, disabled: off }}
              accessibilityLabel={future ? relativeDayName(day, today) : compareKeys(day, addDays(today, -1)) >= 0 ? relativeDayName(day, today) : tr.dates.readOnly(relativeDayName(day, today))}
              style={[styles.num, !isSel && isToday && { borderWidth: 1.5, borderColor: t.inverse }]}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isSel || isToday ? '700' : '500',
                  color: isSel ? t.onInverse : off ? t.faint : t.text,
                  fontVariant: ['tabular-nums'],
                }}>
                {fromKey(day).getDate()}
              </Text>
            </Pressable>
            <View style={[styles.dot, { backgroundColor: avg === null || avg <= 0 ? 'transparent' : hexToRgba(t.slate, 0.25 + 0.75 * avg) }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 72 },
  week: { flexDirection: 'row', paddingHorizontal: PAD },
  day: { alignItems: 'center', gap: 4 },
  letter: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  num: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', left: 0, top: 20, width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, fromKey, relativeDayName, WEEKDAY_LETTER, weekdayIndex, type DateKey } from '@/lib/dates';
import { dayStats } from '@/lib/habits';
import { useData } from '@/lib/store';
import { hexToRgba, useTheme } from '@/theme';

type Props = {
  today: DateKey;
  selected: DateKey;
  onSelect: (day: DateKey) => void;
};

/**
 * Fem dager bakover, i dag og i morgen. Bare i dag og i går kan trykkes (i går kan rettes).
 * Prikken under er sterkere jo mer som ble gjort den dagen.
 */
export function WeekStrip({ today, selected, onSelect }: Props) {
  const t = useTheme();
  const data = useData();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 5));

  return (
    <View style={styles.strip}>
      {days.map((day, i) => {
        const offset = i - 5; // -5 … +1
        const isSel = day === selected;
        const isToday = offset === 0;
        const editable = offset === 0 || offset === -1;
        const avg = offset <= 0 ? dayStats(data, day).average : null;
        return (
          <View key={day} style={styles.day}>
            <Text style={[styles.letter, { color: t.sub }]}>{WEEKDAY_LETTER[weekdayIndex(day)]}</Text>
            <Pressable
              disabled={!editable}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel, disabled: !editable }}
              accessibilityLabel={
                offset > 0 ? 'I morgen' : editable ? relativeDayName(day, today) : `${relativeDayName(day, today)}, låst`
              }
              style={[
                styles.num,
                isSel && { backgroundColor: t.inverse },
                !isSel && isToday && { borderWidth: 1.5, borderColor: t.inverse },
              ]}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isSel || isToday ? '700' : '500',
                  color: isSel ? t.onInverse : offset > 0 ? t.sub : t.text,
                  fontVariant: ['tabular-nums'],
                }}>
                {fromKey(day).getDate()}
              </Text>
            </Pressable>
            <View
              style={[
                styles.dot,
                { backgroundColor: avg === null || avg <= 0 ? 'transparent' : hexToRgba(t.slate, 0.25 + 0.75 * avg) },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  letter: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  num: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

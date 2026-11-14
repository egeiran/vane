import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { addDays, fromKey, relativeDayName, STRIP_PAST_DAYS, weekdayIndex, type DateKey } from '@/lib/dates';
import { dayStats } from '@/lib/habits';
import { useData } from '@/lib/store';
import { hexToRgba, useTheme } from '@/theme';

type Props = {
  today: DateKey;
  selected: DateKey;
  onSelect: (day: DateKey) => void;
  /** Hvor sterk prikken under dagen er, 0–1. Uten den: hvor mye av vanene og målene som ble gjort. */
  dot?: (day: DateKey) => number | null;
};

/**
 * Fem dager bakover, i dag og i morgen. Alle dagene bakover kan åpnes, men bare i dag og i går kan
 * endres (det sjekker skjermene selv). Prikken under er sterkere jo mer som ble gjort den dagen.
 */
export function WeekStrip({ today, selected, onSelect, dot }: Props) {
  const t = useTheme();
  const data = useData();
  const days = Array.from({ length: STRIP_PAST_DAYS + 2 }, (_, i) => addDays(today, i - STRIP_PAST_DAYS));

  return (
    <View style={styles.strip}>
      {days.map((day, i) => {
        const offset = i - STRIP_PAST_DAYS; // -5 … +1
        const isSel = day === selected;
        const isToday = offset === 0;
        const editable = offset === 0 || offset === -1;
        const avg = offset > 0 ? null : dot ? dot(day) : dayStats(data, day).average;
        return (
          <View key={day} style={styles.day}>
            <Text style={[styles.letter, { color: t.sub }]}>{tr.dates.weekdayLetters[weekdayIndex(day)]}</Text>
            <Pressable
              disabled={offset > 0}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel, disabled: offset > 0 }}
              accessibilityLabel={
                offset > 0 ? tr.dates.tomorrow : editable ? relativeDayName(day, today) : tr.dates.readOnly(relativeDayName(day, today))
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

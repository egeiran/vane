import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WEEKDAY_LETTER } from '@/lib/dates';
import { useTheme } from '@/theme';

export type HeatCell = {
  key: string;
  color: string;
  /** Tynn ring rundt i dag. */
  today?: boolean;
  selected?: boolean;
  label?: string;
  onPress?: () => void;
};

export type HeatWeek = { label: string; cells: HeatCell[] };

/** Uker som rader (mandag–søndag), med dato for mandagen til venstre. */
export function WeekRows({ weeks, cellHeight = 34 }: { weeks: HeatWeek[]; cellHeight?: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.label} />
        {WEEKDAY_LETTER.map((l, i) => (
          <Text key={i} style={[styles.letter, { color: t.sub }]}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((w) => (
        <View key={w.label} style={styles.row}>
          <Text style={[styles.label, { color: t.sub }]}>{w.label}</Text>
          {w.cells.map((c) => {
            const ring = c.selected
              ? { borderWidth: 2, borderColor: t.text }
              : c.today
                ? { borderWidth: 1.5, borderColor: t.sub }
                : null;
            const style = [styles.cell, { height: cellHeight, backgroundColor: c.color }, ring];
            return c.onPress ? (
              <Pressable
                key={c.key}
                onPress={c.onPress}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                accessibilityState={{ selected: c.selected }}
                style={style}
              />
            ) : (
              <View key={c.key} style={style} accessibilityLabel={c.label} />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Kompakt rutenett med uker som kolonner (eldst til venstre) og ukedager som rader. */
export function ColumnGrid({ columns, size, gap = 1 }: { columns: string[][]; size: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {columns.map((col, ci) => (
        <View key={ci} style={{ gap }}>
          {col.map((color, ri) => (
            <View key={ri} style={{ width: size, height: size, borderRadius: Math.max(1, size / 4), backgroundColor: color }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Liten forklaring på fargestyrken. */
export function Legend({ colors }: { colors: string[] }) {
  const t = useTheme();
  return (
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.legendText, { color: t.sub }]}>Mindre</Text>
      {colors.map((c, i) => (
        <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
      ))}
      <Text style={[styles.legendText, { color: t.sub }]}>Mer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { width: 50, fontSize: 12 },
  letter: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  cell: { flex: 1, borderRadius: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  legendText: { fontSize: 12, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
});

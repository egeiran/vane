import { StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { kcalText, PROTEIN_SCALE, proteinText, towardGoal } from '@/lib/food';
import { useTheme } from '@/theme';

import { Icon } from './Icon';

type Props = {
  /** Tideler gram. */
  protein: number;
  /** Gram, eller `null` uten mål. */
  goal: number | null;
  /** `null` når kaloriene ikke vises. */
  kcal: number | null;
  /** Mindre tekst, for kortet på I dag. */
  compact?: boolean;
};

/**
 * Dagens protein som en rolig stolpe: «92 / 140 g». Når målet er nådd, blir stolpen full med en
 * hake, og tallet fortsetter å telle. Ingen farge for «for lite» eller «for mye».
 */
export function ProteinBar({ protein, goal, kcal, compact }: Props) {
  const t = useTheme();
  const c = t.colors.fersken;
  const fraction = goal ? Math.min(protein / (goal * PROTEIN_SCALE), 1) : 0;
  const reached = !!goal && fraction >= 1;
  const value = goal ? tr.food.ofGoal(towardGoal(protein, goal), String(goal)) : proteinText(protein);

  return (
    <View
      style={{ gap: compact ? 6 : 8 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={[tr.food.progressLabel(towardGoal(protein, goal), goal ? String(goal) : null), reached ? tr.food.goalReached : '', kcal !== null ? kcalText(kcal) : '']
        .filter(Boolean)
        .join('. ')}
      accessibilityValue={goal ? { min: 0, max: goal, now: Math.min(Math.round(protein / PROTEIN_SCALE), goal) } : undefined}>
      <View style={styles.top}>
        <Text style={[compact ? styles.labelSmall : styles.label, { color: t.text }]}>{tr.food.protein}</Text>
        <View style={styles.value}>
          {reached ? <Icon name="checkmark.circle.fill" size={compact ? 16 : 18} color={c.solid} /> : null}
          <Text style={[compact ? styles.numberSmall : styles.number, { color: reached ? c.ink : t.text }]}>{value}</Text>
        </View>
      </View>
      <View style={[styles.track, compact && styles.trackSmall, { backgroundColor: c.soft }]}>
        {fraction > 0 ? <View style={[styles.fill, compact && styles.trackSmall, { width: `${fraction * 100}%`, backgroundColor: c.solid }]} /> : null}
      </View>
      {kcal !== null ? <Text style={[styles.kcal, { color: t.sub }]}>{kcalText(kcal)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 17, fontWeight: '700' },
  labelSmall: { fontSize: 16, fontWeight: '600' },
  value: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  number: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numberSmall: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  trackSmall: { height: 8, borderRadius: 4 },
  fill: { height: 12, borderRadius: 6 },
  kcal: { fontSize: 14, fontVariant: ['tabular-nums'] },
});

import { StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { formatNumber, kcalText, PROTEIN_SCALE, proteinText, towardGoal } from '@/lib/food';
import { useTheme } from '@/theme';

import { Icon } from './Icon';

type Props = {
  /** Tideler gram. */
  protein: number;
  /** Gram, eller `null` uten mål. */
  goal: number | null;
  /** `null` når kaloriene ikke vises. */
  kcal: number | null;
  /** Mindre tekst, for kortet på I dag og loggearket. */
  compact?: boolean;
};

/**
 * Dagens protein og kalorier hver for seg: protein med stolpe til venstre («92 / 140 g»), kalorier
 * til høyre, skilt med en tynn strek. Når proteinmålet er nådd, blir stolpen full med en hake, og
 * tallet fortsetter å telle. Ingen farge for «for lite» eller «for mye», og ingen mål for kalorier.
 */
export function ProteinBar({ protein, goal, kcal, compact }: Props) {
  const t = useTheme();
  const c = t.colors.fersken;
  const fraction = goal ? Math.min(protein / (goal * PROTEIN_SCALE), 1) : 0;
  const reached = !!goal && fraction >= 1;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={[tr.food.progressLabel(towardGoal(protein, goal), goal ? String(goal) : null), reached ? tr.food.goalReached : '', kcal !== null ? kcalText(kcal) : '']
        .filter(Boolean)
        .join('. ')}
      accessibilityValue={goal ? { min: 0, max: goal, now: Math.min(Math.round(protein / PROTEIN_SCALE), goal) } : undefined}>
      <View style={[styles.protein, { gap: compact ? 4 : 6 }]}>
        <Text style={[styles.label, { color: t.sub }]}>{tr.food.protein}</Text>
        <View style={styles.value}>
          {reached ? <Icon name="checkmark.circle.fill" size={compact ? 15 : 18} color={c.solid} /> : null}
          <Text style={[compact ? styles.numberSmall : styles.number, { color: c.ink }]}>
            {goal ? towardGoal(protein, goal) : proteinText(protein)}
          </Text>
          {goal ? <Text style={[compact ? styles.unitSmall : styles.unit, { color: t.sub }]}>{tr.food.ofGoalSuffix(String(goal))}</Text> : null}
        </View>
        <View style={[styles.track, compact && styles.trackSmall, { backgroundColor: c.soft }]}>
          {fraction > 0 ? <View style={[styles.fill, compact && styles.trackSmall, { width: `${fraction * 100}%`, backgroundColor: c.solid }]} /> : null}
        </View>
      </View>
      {kcal !== null ? (
        <View style={[styles.kcal, { borderLeftColor: t.separator, gap: compact ? 4 : 6 }]}>
          <Text style={[styles.label, { color: t.sub }]}>{tr.food.kcalLabel}</Text>
          <View style={styles.value}>
            <Text style={[compact ? styles.numberSmall : styles.number, { color: t.text }]}>{formatNumber(kcal)}</Text>
            <Text style={[compact ? styles.unitSmall : styles.unit, { color: t.sub }]}>{tr.food.kcalUnit}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  protein: { flex: 1, minWidth: 0 },
  kcal: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 14, justifyContent: 'flex-start' },
  label: { fontSize: 13, fontWeight: '600' },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  number: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numberSmall: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  unitSmall: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 2 },
  trackSmall: { height: 7, borderRadius: 4 },
  fill: { height: 10, borderRadius: 5 },
});

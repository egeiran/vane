import { StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { addDays, type DateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

import { IconButton } from './ui';

/** På web finnes ikke iOS-velgeren, så datoen stilles én dag om gangen. Bare for testing. */
export function DateField({ value, onChange, min, max, text }: { value: DateKey; onChange: (day: DateKey) => void; min?: DateKey; max?: DateKey; text: string; label: string }) {
  const t = useTheme();
  const canBack = !min || value > min;
  const canFwd = !max || value < max;
  return (
    <View style={styles.row}>
      <IconButton icon="chevron.left" label={tr.common.dayBefore} size={36} background={t.field} color={canBack ? t.text : t.faint} onPress={() => canBack && onChange(addDays(value, -1))} />
      <Text style={[styles.text, { color: t.text }]} accessibilityLiveRegion="polite" numberOfLines={2}>
        {text}
      </Text>
      <IconButton icon="chevron.right" label={tr.common.dayAfter} size={36} background={t.field} color={canFwd ? t.text : t.faint} onPress={() => canFwd && onChange(addDays(value, 1))} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { minWidth: 90, textAlign: 'center', fontSize: 16, fontWeight: '600' },
});

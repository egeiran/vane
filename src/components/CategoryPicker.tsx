import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { categoryName } from '@/lib/money';
import type { Category } from '@/lib/types';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { tick } from './ui';

/** Kategoriene som brikker med ikon. Én kan være valgt. */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={tr.common.category}>
      {categories.map((c) => {
        const on = c.id === value;
        const color = t.colors[c.color];
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              tick();
              onChange(c.id);
            }}
            accessibilityRole="radio"
            accessibilityLabel={categoryName(c)}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: on ? color.ink : color.soft, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Icon name={c.icon} size={15} color={on ? t.card : color.ink} />
            <Text style={[styles.label, { color: on ? t.card : color.ink }]} numberOfLines={1}>
              {categoryName(c)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontSize: 15, fontWeight: '600' },
});

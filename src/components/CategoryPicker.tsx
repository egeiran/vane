import { StyleSheet, View } from 'react-native';

import { tr } from '@/i18n';
import { categoryName } from '@/lib/money';
import type { Category } from '@/lib/types';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Chip, tick } from './ui';

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
          <Chip
            key={c.id}
            label={categoryName(c)}
            on={on}
            color={color}
            icon={<Icon name={c.icon} size={15} color={on ? t.card : color.ink} />}
            onPress={() => {
              tick();
              onChange(c.id);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

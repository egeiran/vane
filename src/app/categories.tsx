import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Card, IconButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { categoryName } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { useTheme } from '@/theme';


/** Kategoriene: rekkefølge, skjule og vise, og trykk for å endre navn, ikon og farge. */
export default function CategoriesScreen() {
  const t = useTheme();
  const categories = useMoney((s) => s.categories);
  const moveCategory = useMoney((s) => s.moveCategory);
  const updateCategory = useMoney((s) => s.updateCategory);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader title={tr.categories.title} large right={[{ label: tr.categories.new, icon: 'plus', onPress: () => router.push('/category-form') }]} />

      <Card style={styles.list}>
        {categories.map((c, i) => (
          <View key={c.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }]}>
            <Pressable
              onPress={() => router.push({ pathname: '/category-form', params: { id: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={tr.categories.edit(categoryName(c), c.hidden)}
              style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : c.hidden ? 0.5 : 1 }]}>
              <CategoryIcon category={c} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {categoryName(c)}
                </Text>
                {c.hidden ? <Text style={{ fontSize: 13, color: t.sub }}>{tr.categories.hidden}</Text> : null}
              </View>
            </Pressable>
            <IconButton
              icon={c.hidden ? 'eye.slash' : 'eye'}
              label={c.hidden ? tr.categories.show(categoryName(c)) : tr.categories.hide(categoryName(c))}
              size={36}
              background="transparent"
              color={t.sub}
              onPress={() => {
                tick();
                updateCategory(c.id, { hidden: !c.hidden });
              }}
            />
            <IconButton
              icon="chevron.up"
              label={tr.categories.moveUp(categoryName(c))}
              size={36}
              background="transparent"
              color={i === 0 ? t.faint : t.sub}
              onPress={() => moveCategory(c.id, -1)}
            />
            <IconButton
              icon="chevron.down"
              label={tr.categories.moveDown(categoryName(c))}
              size={36}
              background="transparent"
              color={i === categories.length - 1 ? t.faint : t.sub}
              onPress={() => moveCategory(c.id, 1)}
            />
          </View>
        ))}
      </Card>
      <Text style={[styles.footnote, { color: t.sub }]}>{tr.categories.help}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  list: { marginHorizontal: 16, paddingLeft: 14, paddingRight: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  name: { fontSize: 16, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});

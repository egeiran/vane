import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SortableList } from '@/components/SortableList';
import { Card, IconButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { categoryName } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { useTheme } from '@/theme';

/**
 * Kategoriene: rekkefølge (hold inne og dra, eller Endre), skjule og vise, og trykk for å endre navn,
 * ikon og farge.
 */
export default function CategoriesScreen() {
  const t = useTheme();
  const categories = useMoney((s) => s.categories);
  const moveCategory = useMoney((s) => s.moveCategory);
  const updateCategory = useMoney((s) => s.updateCategory);
  const [editing, setEditing] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader
        title={tr.categories.title}
        large
        right={[
          { label: editing ? tr.common.done : tr.common.edit, variant: editing ? 'done' : 'plain', onPress: () => setEditing(!editing) },
          { label: tr.categories.new, icon: 'plus', onPress: () => router.push('/category-form') },
        ]}
      />

      <Card style={styles.list}>
        <SortableList
          items={categories}
          keyOf={(c) => c.id}
          rowHeight={60}
          editing={editing}
          onMove={moveCategory}
          renderRow={(c, handle) => (
            <View style={styles.row}>
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
              {handle}
            </View>
          )}
        />
      </Card>
      <Text style={[styles.footnote, { color: t.sub }]}>{tr.categories.help}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  list: { marginHorizontal: 16, marginTop: 8, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  name: { fontSize: 16, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});

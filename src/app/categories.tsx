import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Card, IconButton, PrimaryButton, tick } from '@/components/ui';
import { useMoney } from '@/lib/moneyStore';
import { useTheme } from '@/theme';

function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/money');
}

/** Kategoriene: rekkefølge, skjule og vise, og trykk for å endre navn, ikon og farge. */
export default function CategoriesScreen() {
  const t = useTheme();
  const categories = useMoney((s) => s.categories);
  const moveCategory = useMoney((s) => s.moveCategory);
  const updateCategory = useMoney((s) => s.updateCategory);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Tilbake" style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>Tilbake</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        Kategorier
      </Text>

      <Card style={styles.list}>
        {categories.map((c, i) => (
          <View key={c.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
            <Pressable
              onPress={() => router.push({ pathname: '/category-form', params: { id: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Endre ${c.name}${c.hidden ? ', skjult' : ''}`}
              style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : c.hidden ? 0.5 : 1 }]}>
              <CategoryIcon category={c} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {c.name}
                </Text>
                {c.hidden ? <Text style={{ fontSize: 13, color: t.sub }}>Skjult</Text> : null}
              </View>
            </Pressable>
            <IconButton
              icon={c.hidden ? 'eye.slash' : 'eye'}
              label={c.hidden ? `Vis ${c.name}` : `Skjul ${c.name}`}
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
              label={`Flytt ${c.name} opp`}
              size={36}
              background="transparent"
              color={i === 0 ? t.faint : t.sub}
              onPress={() => moveCategory(c.id, -1)}
            />
            <IconButton
              icon="chevron.down"
              label={`Flytt ${c.name} ned`}
              size={36}
              background="transparent"
              color={i === categories.length - 1 ? t.faint : t.sub}
              onPress={() => moveCategory(c.id, 1)}
            />
          </View>
        ))}
      </Card>
      <Text style={[styles.footnote, { color: t.sub }]}>
        Skjulte kategorier er borte fra valgene og varslene. Gamle kjøp beholder dem.
      </Text>

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <PrimaryButton label="Ny kategori" onPress={() => router.push('/category-form')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  list: { marginHorizontal: 16, paddingLeft: 14, paddingRight: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  name: { fontSize: 16, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});

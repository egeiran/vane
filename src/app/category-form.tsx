import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Card, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { CATEGORY_ICONS, categoryName } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import type { Category, ColorKey } from '@/lib/types';
import { CATEGORY_COLOR_KEYS, useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/categories');
}

/** Ny kategori, eller endre navn, ikon og farge på en (?id=…). */
export default function CategoryFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useMoney((s) => s.categories.find((c) => c.id === id));
  const addCategory = useMoney((s) => s.addCategory);
  const updateCategory = useMoney((s) => s.updateCategory);
  // Standardkategorier vises på brukerens språk. Endres ikke navnet, lagres det som før (se `categoryName`).
  const [name, setName] = useState(existing ? categoryName(existing) : '');
  const [icon, setIcon] = useState<Category['icon']>(existing?.icon ?? 'tag');
  const [color, setColor] = useState<ColorKey>(existing?.color ?? 'himmel');
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (existing) updateCategory(existing.id, { name: name === categoryName(existing) ? existing.name : name, icon, color });
    else addCategory({ name, icon, color });
    close();
  };

  const c = t.colors[color];
  const preview: Category = { id: 'preview', name, icon, color, hidden: false };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {existing ? tr.categories.editTitle : tr.categories.new}
        </Text>
        <TextButton label={existing ? tr.common.save : tr.common.add} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <CategoryIcon category={preview} size={72} />
        </View>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="category-name">
            {tr.common.name}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tr.categories.namePlaceholder}
            placeholderTextColor={t.faint}
            autoFocus={!existing}
            returnKeyType="done"
            accessibilityLabelledBy="category-name"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
          <Text style={[styles.label, { color: t.sub, marginTop: 6 }]}>{tr.common.color}</Text>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel={tr.common.color}>
            {CATEGORY_COLOR_KEYS.map((k) => {
              const on = k === color;
              return (
                <Pressable
                  key={k}
                  onPress={() => setColor(k)}
                  accessibilityRole="radio"
                  accessibilityLabel={tr.colors[k]}
                  accessibilityState={{ selected: on }}
                  style={styles.swatchHit}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: t.colors[k].solid },
                      on && { borderWidth: 3, borderColor: t.card, outlineWidth: 2, outlineColor: t.colors[k].solid },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]}>{tr.common.icon}</Text>
          <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel={tr.common.icon}>
            {CATEGORY_ICONS.map((i) => {
              const on = i === icon;
              return (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  accessibilityRole="radio"
                  accessibilityLabel={i}
                  accessibilityState={{ selected: on }}
                  style={[styles.iconHit, { backgroundColor: on ? c.ink : t.field }]}>
                  <Icon name={i} size={20} color={on ? t.card : t.text} />
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchHit: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconHit: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

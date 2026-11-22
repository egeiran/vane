import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SortableList } from '@/components/SortableList';
import { Card, PrimaryButton } from '@/components/ui';
import { tr } from '@/i18n';
import { frequencyText } from '@/lib/habits';
import { showTime, weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

/**
 * Alle vanene, i den rekkefølgen de står på I dag og i widgetene. Hold inne og dra, eller trykk Endre,
 * for å flytte. Trykk på en vane for rutenettet.
 */
export default function HabitsScreen() {
  const t = useTheme();
  const habits = useStore((s) => s.habits);
  const moveHabit = useStore((s) => s.moveHabit);
  const weekStart = useStore((s) => weekStartOf(s.settings));
  const remindersOn = useStore((s) => s.settings.remindersEnabled);
  const [editing, setEditing] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader
        title={tr.habits.pageTitle}
        large
        right={[
          ...(habits.length > 1 ? [{ label: editing ? tr.common.done : tr.common.edit, variant: editing ? ('done' as const) : ('plain' as const), onPress: () => setEditing(!editing) }] : []),
          { label: tr.today.newHabit, icon: 'plus', onPress: () => router.push('/habit-form') },
        ]}
      />

      {habits.length ? (
        <>
          <Card style={styles.list}>
            <SortableList
              items={habits}
              keyOf={(h) => h.id}
              rowHeight={62}
              editing={editing}
              onMove={moveHabit}
              renderRow={(h, handle) => {
                const meta = [frequencyText(h, weekStart), remindersOn && h.reminder ? tr.habits.reminder(showTime(h.reminder)) : ''].filter(Boolean).join(' · ');
                return (
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.name}. ${meta}`}
                      style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>
                      <View style={[styles.dot, { backgroundColor: t.colors[h.color].solid }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                          {h.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: t.sub }} numberOfLines={1}>
                          {meta}
                        </Text>
                      </View>
                    </Pressable>
                    {handle}
                  </View>
                );
              }}
            />
          </Card>
          <Text style={[styles.footnote, { color: t.sub }]}>{tr.habits.pageHelp}</Text>
        </>
      ) : (
        <Card style={styles.empty}>
          <Text style={{ fontSize: 15, lineHeight: 21, color: t.sub }}>{tr.today.emptyText}</Text>
          <PrimaryButton label={tr.today.addFirst} onPress={() => router.push('/habit-form')} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  list: { marginHorizontal: 16, marginTop: 8, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
  empty: { marginHorizontal: 16, marginTop: 8, padding: 20, gap: 12 },
});

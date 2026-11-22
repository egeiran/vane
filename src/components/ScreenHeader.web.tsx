import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import type { HeaderItem } from './ScreenHeader';

export type { HeaderButton, HeaderItem, HeaderMenu } from './ScreenHeader';

/**
 * På web finnes ikke den native verktøylinja (`Stack.Toolbar` gjør ingenting der), så knappene legges
 * i `headerLeft` og `headerRight` som tekst. Bare for skjermbilder og testing i nettleseren.
 */
export function ScreenHeader({ title, left, right }: { title: string; large?: boolean; left?: HeaderItem[]; right?: HeaderItem[] }) {
  return (
    <Stack.Screen
      options={{
        title,
        headerLeft: left?.length ? () => <Buttons items={left} /> : undefined,
        headerRight: right?.length ? () => <Buttons items={right} /> : undefined,
      }}
    />
  );
}

function Buttons({ items }: { items: HeaderItem[] }) {
  const t = useTheme();
  const flat = items.flatMap((item) => ('items' in item ? item.items.map((a) => ({ ...a, variant: 'plain' as const, disabled: false })) : [item]));
  return (
    <View style={styles.row}>
      {flat.map((b) => (
        <Pressable key={b.label} onPress={b.onPress} disabled={b.disabled} accessibilityRole="button" style={({ pressed }) => [styles.button, { opacity: b.disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
          <Text style={{ fontSize: 17, color: t.text, fontWeight: 'variant' in b && b.variant === 'done' ? '700' : '500' }}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingHorizontal: 8 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});

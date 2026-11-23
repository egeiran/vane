import { Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import type { HeaderButton, HeaderItem, HeaderMenu } from './ScreenHeader';

export type { HeaderButton, HeaderItem, HeaderMenu } from './ScreenHeader';

/** Ikonene som har et tegn som ligner. Andre ikonknapper viser teksten sin. */
const GLYPHS: Record<string, string> = { plus: '+' };

/**
 * På web finnes ikke den native verktøylinja (`Stack.Toolbar` gjør ingenting der), så knappene legges
 * i `headerLeft` og `headerRight`. De ligner iPhone så godt det går: + er et tegn, og en meny er én
 * knapp som åpner en liten liste. Bare for skjermbilder og testing i nettleseren.
 */
export function ScreenHeader({ title, left, right }: { title: string; large?: boolean; left?: HeaderItem[]; right?: HeaderItem[] }) {
  return (
    <Stack.Screen
      options={{
        title,
        // Bare knappene som finnes: uten knapper til venstre gjelder det `_layout.tsx` sier (pil tilbake på
        // undersidene, ingenting på ark).
        ...(left?.length ? { headerLeft: () => <Buttons items={left} /> } : {}),
        ...(right?.length ? { headerRight: () => <Buttons items={right} /> } : {}),
      }}
    />
  );
}

function Buttons({ items }: { items: HeaderItem[] }) {
  return (
    <View style={styles.row}>
      {items.map((item) => ('items' in item ? <Menu key={item.label} menu={item} /> : <Button key={item.label} button={item} />))}
    </View>
  );
}

function Label({ text, icon, bold }: { text: string; icon?: string; bold?: boolean }) {
  const t = useTheme();
  const glyph = icon ? GLYPHS[icon] : undefined;
  return <Text style={{ fontSize: glyph ? 28 : 17, lineHeight: glyph ? 30 : 22, color: t.text, fontWeight: bold ? '700' : glyph ? '400' : '500' }}>{glyph ?? text}</Text>;
}

function Button({ button: b }: { button: HeaderButton }) {
  return (
    <Pressable
      onPress={b.onPress}
      disabled={b.disabled}
      accessibilityRole="button"
      accessibilityLabel={b.label}
      style={({ pressed }) => [styles.button, { opacity: b.disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Label text={b.label} icon={b.icon} bold={b.variant === 'done'} />
    </Pressable>
  );
}

function Menu({ menu }: { menu: HeaderMenu }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={menu.label} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}>
        <Label text={menu.label} icon={menu.icon} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={menu.label}>
          <View style={[styles.sheet, { backgroundColor: t.card }]}>
            {menu.items.map((a, i) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  setOpen(false);
                  a.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ fontSize: 17, color: a.destructive ? t.danger : t.text }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingHorizontal: 8 },
  button: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  backdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 56, paddingRight: 12 },
  sheet: { minWidth: 220, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
});

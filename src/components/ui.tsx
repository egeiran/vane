import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/theme';

import { Icon } from './Icon';

/** Et lite, rolig «tikk» ved avhuking. */
export function tick() {
  Haptics.selectionAsync().catch(() => {});
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: 20 }, style]}>{children}</View>;
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionLabel, { color: t.sub }]} accessibilityRole="header">
        {children.toUpperCase()}
      </Text>
      {typeof right === 'string' ? <Text style={[styles.sectionRight, { color: t.sub }]}>{right}</Text> : right}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 44,
  background,
  color,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  size?: number;
  background?: string;
  color?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? t.button,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <Icon name={icon} size={size * 0.42} color={color ?? t.text} />
    </Pressable>
  );
}

export function TextButton({
  label,
  onPress,
  color,
  bold,
  disabled,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  bold?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [styles.textButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Text style={{ fontSize: 17, fontWeight: bold ? '700' : '500', color: color ?? t.text }}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: disabled ? t.button : t.inverse, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: disabled ? t.sub : t.onInverse }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segment, { backgroundColor: t.segment }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[
              styles.segmentItem,
              on && { backgroundColor: t.segmentOn, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
            ]}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: on ? t.text : t.sub }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  minWidth = 36,
}: {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  minWidth?: number;
}) {
  const t = useTheme();
  return (
    <View style={styles.stepper}>
      <IconButton icon="minus" label={decreaseLabel} onPress={onDecrease} background={t.field} />
      <Text accessibilityLiveRegion="polite" style={{ minWidth, textAlign: 'center', fontSize: 19, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <IconButton icon="plus" label={increaseLabel} onPress={onIncrease} background={t.field} />
    </View>
  );
}

export function Row({ children, first }: { children: ReactNode; first?: boolean }) {
  const t = useTheme();
  return <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>{children}</View>;
}

export function SwitchRow({ label, value, onChange, first }: { label: string; value: boolean; onChange: (v: boolean) => void; first?: boolean }) {
  const t = useTheme();
  return (
    <Row first={first}>
      <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.switchOn }} accessibilityLabel={label} />
    </Row>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionLabel: { fontSize: 13, lineHeight: 20, fontWeight: '600', letterSpacing: 0.5 },
  sectionRight: { fontSize: 13, lineHeight: 20 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  primary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 2, borderRadius: 12 },
  segmentItem: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 12, paddingVertical: 4 },
});

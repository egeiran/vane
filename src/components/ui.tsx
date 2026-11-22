import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme, type HabitColor } from '@/theme';

import { Icon } from './Icon';

/** Et lite, rolig «tikk» ved avhuking. */
export function tick() {
  Haptics.selectionAsync().catch(() => {});
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * En knapp som krymper litt når fingeren er på den (100–150 ms), som iOS-knapper. Med «Reduser
 * bevegelse» blir den bare litt svakere i stedet.
 */
export function PressableScale({
  style,
  scale = 0.96,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number }) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        style,
        reduced ? { opacity: pressed ? 0.7 : 1 } : { transform: [{ scale: pressed ? scale : 1 }] },
        { transitionProperty: reduced ? 'opacity' : 'transform', transitionDuration: pressed ? 100 : 160, transitionTimingFunction: EASE_OUT },
      ]}
    />
  );
}

/**
 * Valgknappen som brukes overalt: måltid, kategori, filter, mengde. `on` er valgt. Med `color` får den
 * vanens eller kategoriens farge.
 */
export function Chip({
  label,
  on,
  onPress,
  icon,
  color,
  role = 'radio',
  selectable = true,
  accessibilityLabel,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: ReactNode;
  color?: HabitColor;
  role?: 'radio' | 'button';
  /** `false` for en vanlig knapp der `on` bare er utseendet (ikke «valgt» for skjermleser). */
  selectable?: boolean;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg = color ? (on ? color.ink : color.soft) : on ? t.inverse : t.button;
  const fg = color ? (on ? t.card : color.ink) : on ? t.onInverse : t.text;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selectable ? { selected: on } : undefined}
      hitSlop={4}
      style={[styles.chip, { backgroundColor: bg }]}>
      {icon}
      <Text style={[styles.chipLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
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
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      scale={0.92}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background ?? t.button,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={size * 0.42} color={color ?? t.text} />
    </PressableScale>
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

export function PrimaryButton({ label, onPress, disabled, destructive }: { label: string; onPress: () => void; disabled?: boolean; destructive?: boolean }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scale={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.primary, { backgroundColor: disabled ? t.button : destructive ? t.danger : t.inverse }]}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: disabled ? t.sub : destructive ? (t.dark ? t.bg : '#FFFFFF') : t.onInverse }}>{label}</Text>
    </PressableScale>
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
  return <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }]}>{children}</View>;
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
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chipLabel: { fontSize: 15, fontWeight: '600' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 12, paddingVertical: 4 },
});

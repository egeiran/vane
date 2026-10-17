import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  value: number;
  target: number;
  color: string;
  track: string;
  textColor: string;
  onPress?: () => void;
  label: string;
  size?: number;
};

/** Ring som fylles etter hvert som antallet øker. Trykk trekker fra én. */
export function CountRing({ value, target, color, track, textColor, onPress, label, size = 44 }: Props) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const len = Math.min(value / Math.max(target, 1), 1) * c;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: target, now: value }}
      style={({ pressed }) => ({ width: size, height: size, opacity: pressed ? 0.7 : 1 })}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {len > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${len} ${c}`}
          />
        ) : null}
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: textColor, fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
    </Pressable>
  );
}

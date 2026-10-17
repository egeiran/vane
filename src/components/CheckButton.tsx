import { Pressable, View } from 'react-native';

import { Icon } from './Icon';

type Props = {
  done: boolean;
  color: string;
  onPress: () => void;
  label: string;
  /** Synlig størrelse; trykkflaten er alltid minst 44. */
  size?: number;
  checkColor?: string;
};

export function CheckButton({ done, color, onPress, label, size = 44, checkColor = '#FFFFFF' }: Props) {
  const hit = Math.max(44, size);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: hit, height: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: done ? color : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {done ? <Icon name="checkmark" size={size * 0.45} color={checkColor} weight="bold" /> : null}
      </View>
    </Pressable>
  );
}

import Animated, { cubicBezier, useReducedMotion, ZoomIn } from 'react-native-reanimated';

import { Icon } from './Icon';
import { PressableScale } from './ui';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type Props = {
  done: boolean;
  color: string;
  onPress: () => void;
  label: string;
  /** Synlig størrelse; trykkflaten er alltid minst 44. */
  size?: number;
  checkColor?: string;
  /** En dag som bare kan leses. */
  disabled?: boolean;
};

export function CheckButton({ done, color, onPress, label, size = 44, checkColor = '#FFFFFF', disabled }: Props) {
  const hit = Math.max(44, size);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scale={0.9}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, disabled: !!disabled }}
      accessibilityLabel={label}
      style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
      <CheckCircle done={done} color={color} size={size} checkColor={checkColor} />
    </PressableScale>
  );
}

/** Sirkelen i avhukingsknappen: tom ring, eller fylt med hake. Brukes også av tellevaner som har nådd målet. */
export function CheckCircle({ done, color, size = 44, checkColor = '#FFFFFF' }: { done: boolean; color: string; size?: number; checkColor?: string }) {
  const reduced = useReducedMotion();
  // Fyllingen tones på 160 ms, og haken vokser fram fra 60 %. Ingen sprett og ingen feiring.
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        backgroundColor: done ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        transitionProperty: 'backgroundColor',
        transitionDuration: reduced ? 0 : 160,
        transitionTimingFunction: EASE_OUT,
      }}>
      {done ? (
        <Animated.View entering={reduced ? undefined : ZoomIn.duration(180).withInitialValues({ transform: [{ scale: 0.6 }] })}>
          <Icon name="checkmark" size={size * 0.45} color={checkColor} weight="bold" />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

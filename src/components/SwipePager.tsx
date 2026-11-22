import { useEffect, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tick } from './ui';

type Props = {
  /** Endres når perioden byttes (for eksempel «2026-10»). Det nye innholdet glir da inn. */
  pageKey: string;
  canPrev: boolean;
  canNext: boolean;
  /** Eldre periode: dra mot høyre. */
  onPrev: () => void;
  /** Nyere periode: dra mot venstre. */
  onNext: () => void;
  children: ReactNode;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Dra sidelengs for forrige eller neste periode (måned i Penger, uke og år i Oversikt). Innholdet
 * følger fingeren, gir etter i kanten der det ikke finnes mer, glir ut og kommer inn fra den andre
 * siden. Et loddrett drag går til rullingen som før. Med «Reduser bevegelse» tones det bare.
 */
export function SwipePager({ pageKey, canPrev, canNext, onPrev, onNext, children }: Props) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  // -1: nyere kommer inn fra høyre. 1: eldre kommer inn fra venstre.
  const from = useSharedValue(0);

  const go = (dir: number) => {
    tick();
    if (dir > 0) onPrev();
    else onNext();
  };

  // Ny periode: start på motsatt side og gli inn.
  useEffect(() => {
    const dir = from.get();
    if (!dir) return;
    from.set(0);
    if (reduced) {
      x.set(0);
      opacity.set(0);
      opacity.set(withTiming(1, { duration: 180 }));
      return;
    }
    x.set(-dir * width * 0.35);
    opacity.set(0);
    x.set(withTiming(0, { duration: 260, easing: EASE_OUT }));
    opacity.set(withTiming(1, { duration: 200 }));
  }, [pageKey, from, opacity, reduced, width, x]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      const blocked = (e.translationX > 0 && !canPrev) || (e.translationX < 0 && !canNext);
      x.set(blocked ? e.translationX * 0.25 : e.translationX);
    })
    .onEnd((e) => {
      'worklet';
      const dir = e.translationX > width * 0.22 || e.velocityX > 600 ? 1 : e.translationX < -width * 0.22 || e.velocityX < -600 ? -1 : 0;
      const allowed = (dir > 0 && canPrev) || (dir < 0 && canNext);
      if (!dir || !allowed) {
        x.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
        return;
      }
      from.set(dir);
      opacity.set(withTiming(0, { duration: 140 }));
      x.set(
        withTiming(dir * width * 0.6, { duration: 160, easing: EASE_OUT }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(go, dir);
        })
      );
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], opacity: opacity.get() }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { GestureDetector, usePanGesture, useTapGesture, type NativeGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tr } from '@/i18n';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { tick } from './ui';

/**
 * Gesten til lista man blar mellom dager med (`DayPager`). En rad som dras mot venstre, går foran
 * den, så sletting ikke også blar til neste dag. Utenfor I dag og Mat finnes den ikke.
 */
export const PagerGestureContext = createContext<NativeGesture | null>(null);

/** Bredden på Slett-knappen når raden står åpen. */
const ACTION = 88;
/** Så langt (av radens bredde) må man dra for å slette uten å trykke. */
const FULL = 0.55;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Sier om raden nettopp ble dratt, eller står åpen. Se `useSwipeGuard`. */
export type SwipeGuard = { wasDragged: () => boolean; mark: (open?: boolean) => void };

/**
 * Et trykk som kommer når man slipper et drag, skal ikke åpne raden (på web kommer det et klikk etter
 * draget). Lag sperren i raden, gi den til `SwipeRow`, og spør `wasDragged()` i radens `onPress`.
 */
export function useSwipeGuard(): SwipeGuard {
  const state = useRef({ at: 0, open: false });
  return useMemo(
    () => ({
      wasDragged: () => state.current.open || Date.now() - state.current.at < 350,
      mark: (open?: boolean) => {
        state.current.at = Date.now();
        if (open !== undefined) state.current.open = open;
      },
    }),
    []
  );
}

// Bare én rad står åpen om gangen: en ny som åpnes, lukker den forrige.
let closeOpenRow: (() => void) | null = null;

type Props = {
  /** Sletter raden. Den forsvinner fra lista; «Angre» tar den tilbake. */
  onDelete: () => void;
  /** Fra `useSwipeGuard` i raden, så et trykk rett etter et drag ikke åpner den. */
  guard?: SwipeGuard;
  enabled?: boolean;
  children: ReactNode;
};

/**
 * Sveip mot venstre for å slette, som i Mail. Den røde flaten følger fingeren. Et kort sveip lar
 * Slett-knappen stå fremme; et langt sveip (forbi midten, med et lett tikk) sletter når man slipper.
 * Et drag mot høyre lukker en åpen rad, og går ellers videre til lista rundt (forrige dag). Raden
 * må fylle hele bredden i kortet og ha egen bakgrunn; `SwipeRow` gir den kortets farge.
 */
export function SwipeRow({ onDelete, guard, enabled = true, children }: Props) {
  const t = useTheme();
  const pager = useContext(PagerGestureContext);
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(0);
  const armed = useSharedValue(false);
  // 1 mens raden dras og like etter: da når ikke trykk fram til knappene i raden.
  const dragging = useSharedValue(0);
  const [open, setOpen] = useState(false);

  // Det siste fra raden. Funksjonene under er stabile (samme hver tegning), så gestene ikke settes opp
  // på nytt hver gang lista tegnes; det kan gå i ring inne i lista man blar i.
  const latest = useRef({ onDelete, guard });
  useEffect(() => {
    latest.current = { onDelete, guard };
  });

  const close = useCallback(() => {
    x.set(withTiming(0, { duration: 220, easing: EASE }));
    latest.current.guard?.mark(false);
    setOpen(false);
  }, [x]);
  const opened = useCallback(() => {
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
    closeOpenRow = close;
    latest.current.guard?.mark(true);
    setOpen(true);
  }, [close]);
  const closed = useCallback(() => {
    if (closeOpenRow === close) closeOpenRow = null;
    latest.current.guard?.mark(false);
    setOpen(false);
  }, [close]);
  const markDrag = useCallback(() => latest.current.guard?.mark(), []);
  // Når man tar på en annen rad, lukkes den som står åpen (som i Mail).
  const closeOthers = useCallback(() => {
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
  }, [close]);
  const remove = useCallback(() => {
    closed();
    latest.current.onDelete();
    // Raden forsvinner fra lista. Blir den likevel stående, legges den tilbake på plass.
    setTimeout(() => x.set(0), 400);
  }, [closed, x]);
  const removeAnimated = () => {
    x.set(
      withTiming(-width.get(), { duration: 160, easing: EASE }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(remove);
      })
    );
  };

  const panConfig = useMemo(
    () => ({
      enabled,
      // Lukket: bare et drag mot venstre gjelder raden; mot høyre gir den opp, så lista kan bla.
      // (Ingen spredning her: worklet-pluginen godtar den ikke i gestens oppsett.)
      activeOffsetX: (open ? [-10, 10] : -10) as number | [number, number],
      failOffsetX: open ? undefined : 10,
      failOffsetY: [-12, 12] as [number, number],
      block: pager ?? undefined,
      onBegin: () => {
        'worklet';
        scheduleOnRN(closeOthers);
      },
      onActivate: () => {
        'worklet';
        start.set(x.get());
        dragging.set(1);
        scheduleOnRN(markDrag);
      },
      onUpdate: (e: { translationX: number }) => {
        'worklet';
        const next = Math.min(0, start.get() + e.translationX);
        x.set(next);
        const full = width.get() > 0 && -next > width.get() * FULL;
        if (full !== armed.get()) {
          armed.set(full);
          scheduleOnRN(tick);
        }
      },
      onDeactivate: (e: { velocityX: number; canceled?: boolean }) => {
        'worklet';
        dragging.set(withDelay(250, withTiming(0, { duration: 0 })));
        scheduleOnRN(markDrag);
        // Avbrutt (varselsenteret, en samtale, appen legges bort): ingenting slettes, raden går tilbake.
        if (armed.get() && !e.canceled) {
          armed.set(false);
          x.set(
            withTiming(-width.get(), { duration: 160, easing: EASE }, (finished) => {
              'worklet';
              if (finished) scheduleOnRN(remove);
            })
          );
          return;
        }
        armed.set(false);
        if (e.canceled) {
          x.set(withTiming(0, { duration: 220, easing: EASE }));
          scheduleOnRN(closed);
          return;
        }
        if (e.velocityX < 300 && (x.get() < -ACTION / 2 || e.velocityX < -600)) {
          x.set(withTiming(-ACTION, { duration: 220, easing: EASE }));
          scheduleOnRN(opened);
        } else {
          x.set(withTiming(0, { duration: 220, easing: EASE }));
          scheduleOnRN(closed);
        }
      },
    }),
    [armed, closeOthers, closed, dragging, enabled, markDrag, open, opened, pager, remove, start, width, x]
  );
  const pan = usePanGesture(panConfig);

  // Står raden åpen, lukker et trykk på den den i stedet for å åpne den.
  const tapConfig = useMemo(
    () => ({
      enabled: open,
      onActivate: () => {
        'worklet';
        x.set(withTiming(0, { duration: 220, easing: EASE }));
        scheduleOnRN(closed);
      },
    }),
    [closed, open, x]
  );
  const tap = useTapGesture(tapConfig);

  // Hvor langt teksten er flyttet mot venstre kant av den røde flaten (1 når et langt sveip sletter).
  const toEdge = useDerivedValue(() => withTiming(armed.get() ? 1 : 0, { duration: 160, easing: EASE }));
  // Mens raden dras eller står åpen, får ikke knappene i den trykk ('box-only'), bare raden selv.
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    pointerEvents: dragging.get() > 0 || x.get() < -1 ? 'box-only' : 'auto',
  }));
  const redStyle = useAnimatedStyle(() => ({ width: Math.max(0, -x.get()) }));
  const labelStyle = useAnimatedStyle(() => {
    const red = Math.max(0, -x.get());
    return {
      opacity: Math.min(1, red / (ACTION * 0.6)),
      transform: [{ translateX: -Math.max(0, red - ACTION) * toEdge.get() }],
    };
  });

  if (!enabled) return children;
  // Gesten ligger på hele raden (også den røde flaten), så ingenting dekker Slett-knappen.
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={styles.wrap} onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
        {/* Skjult for VoiceOver til raden står åpen; der er Slett en handling på raden (`accessibilityActions`). */}
        <Animated.View
          style={[styles.red, { backgroundColor: t.danger }, redStyle]}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
          <Pressable onPress={removeAnimated} accessibilityRole="button" accessibilityLabel={tr.common.delete} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.label, labelStyle]}>
              <Icon name="trash" size={17} color="#FFFFFF" />
              <Text style={styles.labelText}>{tr.common.delete}</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
        <GestureDetector gesture={tap}>
          <Animated.View style={[{ backgroundColor: t.card }, rowStyle]}>{children}</Animated.View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  red: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  label: { position: 'absolute', top: 0, bottom: 0, right: 0, width: ACTION, alignItems: 'center', justifyContent: 'center', gap: 2 },
  labelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

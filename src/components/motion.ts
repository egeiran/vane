import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * De rolige overgangene i appen, samlet ett sted. Noe som dukker opp, tones inn (200 ms); noe som
 * forsvinner, tones ut (140 ms); og det rundt glir på plass (220 ms) i stedet for å hoppe. Alle følger
 * «Reduser bevegelse» på telefonen (Reanimated sin standard). Ingen sprett og ingen feiring.
 */
export const appear = FadeIn.duration(200);
export const disappear = FadeOut.duration(140);
export const reflow = LinearTransition.duration(220);

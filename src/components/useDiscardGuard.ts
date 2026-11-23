import { usePreventRemove } from 'expo-router';
import { Alert } from 'react-native';

import { tr } from '@/i18n';

/**
 * Spør «Forkaste endringene?» før et skjema med endringer lukkes: med Avbryt, med sveip ned på arket
 * og med tilbake. Et uendret skjema lukkes som før. Returnerer en funksjon som slår av spørsmålet, til
 * bruk rett før skjemaet lukkes etter Lagre.
 */
export function useDiscardGuard(dirty: boolean): () => void {
  return usePreventRemove(dirty, ({ repeat }) => {
    if (process.env.EXPO_OS === 'web') {
      // Alert finnes ikke på web (bare for skjermbilder og testing).
      if (window.confirm(tr.common.discardTitle)) repeat();
      return;
    }
    Alert.alert(tr.common.discardTitle, undefined, [
      { text: tr.common.keepEditing, style: 'cancel' },
      { text: tr.common.discard, style: 'destructive', onPress: repeat },
    ]);
  });
}

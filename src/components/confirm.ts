import { Alert } from 'react-native';

import { tr } from '@/i18n';

/**
 * Spør før noe slettes, med Avbryt og en rød knapp. Alert finnes ikke på web, så der brukes
 * nettleserens egen dialog (bare for skjermbilder og testing).
 */
export function confirmDestructive(title: string, body: string | undefined, action: string, onConfirm: () => void) {
  if (process.env.EXPO_OS === 'web') {
    if (window.confirm(body ? `${title}\n\n${body}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, body, [
    { text: tr.common.cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_FILE_BYTES } from './backup';

/**
 * Filene til eksport og import. Eksport skriver filen i cachen og åpner delingsarket, så man kan
 * lagre den i Filer eller sende den. Import åpner filvelgeren og leser teksten. Logikken ligger i
 * `backup.ts`.
 */

export type FileKind = 'json' | 'csv';

const TYPES: Record<FileKind, { mimeType: string; UTI: string }> = {
  json: { mimeType: 'application/json', UTI: 'public.json' },
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
};

/** Lager filen og åpner delingsarket. Gir false hvis filen ikke kunne lages eller deles. */
export async function shareFile(name: string, text: string, kind: FileKind): Promise<boolean> {
  try {
    // `write` lager filen, eller erstatter den som ligger der.
    const file = new File(Paths.cache, name);
    await file.write(text);
    try {
      await Sharing.shareAsync(file.uri, { ...TYPES[kind], dialogTitle: name });
    } finally {
      // Delingsarket er lukket. Kopien i cachen trengs ikke lenger.
      if (file.exists) file.delete();
    }
    return true;
  } catch {
    return false;
  }
}

/** Filen som ble valgt: teksten, eller at den er for stor til å leses inn. */
export type PickedFile = { text: string } | { tooBig: true };

/** Filtypene filvelgeren viser. En CSV fra et regneark kan også være merket som ren tekst. */
const PICK: Record<FileKind, string[]> = { json: [TYPES.json.mimeType], csv: [TYPES.csv.mimeType, 'text/plain'] };

/**
 * Åpner filvelgeren for en JSON- eller CSV-fil. Gir `null` hvis man avbrøt (også når velgeren ikke
 * kunne åpnes), og kaster hvis filen ikke kunne leses. En fil som er større enn noen eksport, leses
 * ikke inn i minnet.
 */
export async function pickFile(kind: FileKind): Promise<PickedFile | null> {
  const res = await File.pickFileAsync({ mimeTypes: PICK[kind] });
  if (res.canceled) return null;
  if ((res.result.size ?? 0) > MAX_FILE_BYTES) return { tooBig: true };
  return { text: await res.result.text() };
}

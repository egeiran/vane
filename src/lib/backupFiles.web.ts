/**
 * Nettleserens variant, bare for skjermbilder og testing (se README): eksport laster ned filen, og
 * import bruker filvelgeren i nettleseren.
 */

import { MAX_FILE_BYTES } from './backup';

export type FileKind = 'json' | 'csv';
export type PickedFile = { text: string } | { tooBig: true };

export async function shareFile(name: string, text: string, kind: FileKind): Promise<boolean> {
  const url = URL.createObjectURL(new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function pickJsonFile(): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > MAX_FILE_BYTES) return resolve({ tooBig: true });
      file.text().then((text) => resolve({ text }), reject);
    };
    input.click();
  });
}

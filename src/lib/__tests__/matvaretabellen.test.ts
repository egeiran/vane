import { describe, expect, it } from '@jest/globals';

import { nutrientsFor } from '../food';
import { normalize, search, tableFood, tableFoods } from '../matvaretabellen';

describe('Matvaretabellen', () => {
  it('ligger i appen med protein og porsjoner', () => {
    expect(tableFoods().length).toBeGreaterThan(1500);
    const egg = tableFood('02.026');
    expect(egg).toMatchObject({ name: 'Egg, kokt', per100: { protein: 129, kcal: 148 } });
    expect(egg?.portions).toContainEqual({ label: 'stk', grams: 56 });
    // Ett kokt egg (56 g): 7,2 g protein.
    expect(nutrientsFor({ per100: egg!.per100, portion: null }, { kind: 'portion', count: 1, label: 'stk', grams: 56 })?.protein).toBe(72);
  });

  it('søker uten aksenter og med æ, ø og å', () => {
    expect(normalize('Crème Brûlée')).toBe('creme brulee');
    expect(normalize('Bønner')).toBe('bonner');
    expect(normalize('Ærter')).toBe('aerter');
    expect(normalize('Ål')).toBe('al');
  });

  it('alle ordene må treffe, og treff tidlig i navnet kommer først', () => {
    const names = search(tableFoods(), 'kylling filet').map((f) => f.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names[0].startsWith('Kylling, filet')).toBe(true);
    expect(names.every((n) => /kylling/i.test(n) && /filet/i.test(n))).toBe(true);
    expect(search(tableFoods(), 'egg')[0].name.startsWith('Egg')).toBe(true);
    expect(search(tableFoods(), '   ')).toEqual([]);
  });

  it('søkeordene finner andre skrivemåter', () => {
    const items = [
      { name: 'Americano, kaffe', keywords: ['amerikano', 'kaffi'] },
      { name: 'Kaffe, filtermalt', keywords: [] },
    ];
    expect(search(items, 'kaffi').map((i) => i.name)).toEqual(['Americano, kaffe']);
    // Treff i navnet går foran treff i søkeordene.
    expect(search(items, 'kaff').map((i) => i.name)).toEqual(['Kaffe, filtermalt', 'Americano, kaffe']);
  });

  it('søker også i egne matvarer uten søkeord', () => {
    expect(search([{ name: 'Proteinshake' }, { name: 'Skyr' }], 'prot').map((i) => i.name)).toEqual(['Proteinshake']);
  });
});

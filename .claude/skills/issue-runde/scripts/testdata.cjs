// Faste testdata for skjermbilder av Vane i nettleseren (se skjermbilde.cjs).
//
// Samme data før og etter et issue, så bildene viser det samme. «I dag» er onsdag 4. november
// 2026, så en uke som starter på søndag og en som starter på mandag gir forskjellige uker.
// Lagres i localStorage under de samme nøklene som appen bruker (`vane-data` og `vane-penger`).
//
// Endrer et issue formen på dataene, oppdaterer du dette og sier fra i guiden. Lag heller en
// variant med --data enn å endre det alle runder bruker.

const TODAY = '2026-11-04';

const pad = (n) => (n < 10 ? '0' : '') + n;
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (k, n) => {
  const [y, m, d] = k.split('-').map(Number);
  return key(new Date(y, m - 1, d + n));
};

function habitsData() {
  const habits = [
    { id: 'h-tur', name: 'Gå en tur', color: 'salvie', type: 'check', target: 1, unit: '', schedule: { kind: 'daily' }, reminder: '18:00', createdAt: '2026-08-01' },
    { id: 'h-vann', name: 'Drikke vann', color: 'himmel', type: 'count', target: 8, unit: 'glass', schedule: { kind: 'daily' }, reminder: null, createdAt: '2026-08-01' },
    { id: 'h-les', name: 'Lese', color: 'lavendel', type: 'check', target: 1, unit: '', schedule: { kind: 'days', days: [true, false, true, false, true, false, false] }, reminder: '21:30', createdAt: '2026-08-01' },
    { id: 'h-trene', name: 'Trene', color: 'fersken', type: 'check', target: 1, unit: '', schedule: { kind: 'weekly', times: 3 }, reminder: null, createdAt: '2026-08-01' },
  ];
  // Et jevnt, gjentakende mønster de siste 90 dagene, uten tilfeldighet.
  const logs = {};
  for (let i = 1; i <= 90; i++) {
    const day = addDays(TODAY, -i);
    const log = {};
    if (i % 3 !== 0) log['h-tur'] = 1;
    log['h-vann'] = 3 + (i % 6);
    if (i % 2 === 0) log['h-les'] = 1;
    if (i % 4 === 1) log['h-trene'] = 1;
    logs[day] = log;
  }
  // Søndag 1. og mandag 2. november: to økter, så ukestart (#7) gir forskjellig tall.
  logs['2026-11-01'] = { ...logs['2026-11-01'], 'h-trene': 1 };
  logs['2026-11-02'] = { ...logs['2026-11-02'], 'h-trene': 1 };
  logs['2026-11-03'] = { ...logs['2026-11-03'], 'h-trene': undefined };
  logs[TODAY] = { 'h-vann': 5, 'h-tur': 1 };
  return {
    habits,
    logs,
    goals: {
      [TODAY]: [
        { id: 'g1', text: 'Ringe mamma', done: true },
        { id: 'g2', text: 'Rydde boden', done: false },
      ],
    },
    goalsSkipped: {},
    settings: { morningEnabled: true, morningTime: '07:00', remindersEnabled: true },
  };
}

function moneyData() {
  const cat = (id, name, icon, color) => ({ id, name, icon, color, hidden: false });
  const p = (id, amount, currency, merchant, day, time, parts, extra = {}) => ({
    id,
    amount,
    currency,
    merchant,
    merchantKey: merchant.toLowerCase(),
    day,
    time,
    parts,
    skipped: false,
    note: '',
    source: 'applepay',
    ...extra,
  });
  return {
    categories: [
      cat('dagligvarer', 'Dagligvarer', 'cart', 'salvie'),
      cat('spise-ute', 'Spise ute', 'fork.knife', 'fersken'),
      cat('transport', 'Transport', 'tram.fill', 'himmel'),
      cat('hjem', 'Hjem', 'house', 'sand'),
      cat('shopping', 'Shopping', 'bag', 'rose'),
      cat('fritid', 'Fritid', 'ticket', 'lavendel'),
      cat('annet', 'Annet', 'ellipsis.circle', 'skifer'),
    ],
    purchases: [
      p('k1', 18990, 'NOK', 'Rema 1000', TODAY, '17:42', []),
      p('k2', 4500, 'NOK', 'Ruter', TODAY, '08:05', [{ categoryId: 'transport', amount: 4500 }]),
      p('k3', 123450, 'NOK', 'Kiwi', '2026-11-03', '18:20', [
        { categoryId: 'dagligvarer', amount: 100000 },
        { categoryId: 'hjem', amount: 23450 },
      ]),
      p('k4', 1250, 'EUR', 'Café de Flore', '2026-11-02', '10:15', [{ categoryId: 'spise-ute', amount: 1250 }]),
      p('k5', 34900, 'NOK', 'Vinmonopolet', '2026-11-01', '15:30', [{ categoryId: 'annet', amount: 34900 }], { skipped: true, note: 'Utlegg for jobben' }),
      p('k6', 29900, 'NOK', 'Kino', '2026-10-28', '19:55', [{ categoryId: 'fritid', amount: 29900 }], { source: 'manual' }),
      p('k7', 64900, 'NOK', 'Rema 1000', '2026-10-20', '17:10', [{ categoryId: 'dagligvarer', amount: 64900 }]),
      p('k8', 89900, 'NOK', 'Clas Ohlson', '2026-10-12', '12:00', [{ categoryId: 'hjem', amount: 89900 }]),
    ],
    merchants: { 'rema 1000': { categoryId: 'dagligvarer' }, ruter: { categoryId: 'transport' } },
    imported: [],
    setupSeen: true,
  };
}

module.exports = {
  today: TODAY,
  /** Klokkeslettet appen tror det er. */
  now: `${TODAY}T12:00:00`,
  storage: () => ({
    'vane-data': JSON.stringify({ version: 1, state: habitsData() }),
    'vane-penger': JSON.stringify({ version: 1, state: moneyData() }),
  }),
};

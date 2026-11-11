const UNITS = ['nula', 'jedna', 'dva', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět', 'deset', 'jedenáct', 'dvanáct',
  'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct'];
const TENS = ['', '', 'dvacet', 'třicet', 'čtyřicet', 'padesát', 'šedesát', 'sedmdesát', 'osmdesát', 'devadesát'];

export const MAX_VISIT_SCORE = 180;

// Číslo 0–999 slovy, tak jak ho hlasatel vysloví („sto čtyřicet jedna“).
export function czechNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`Číslo mimo rozsah: ${n}`);
  if (n < 20) return UNITS[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${UNITS[n % 10]}` : '');
  const hundreds = Math.floor(n / 100);
  const head = hundreds === 1 ? 'sto' : hundreds === 2 ? 'dvě stě' : hundreds < 5 ? `${UNITS[hundreds]} sta` : `${UNITS[hundreds]} set`;
  return n % 100 ? `${head} ${czechNumber(n % 100)}` : head;
}

// Text hlášení součtu kola; od stovky důraz jako v odsouhlasených ukázkách.
export function scoreAnnouncement(total: number): string {
  if (!Number.isInteger(total) || total < 0 || total > MAX_VISIT_SCORE) throw new RangeError(`Součet kola mimo rozsah: ${total}`);
  const words = czechNumber(total);
  return words[0].toUpperCase() + words.slice(1) + (total >= 100 ? '!' : '.');
}

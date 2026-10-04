export const DEFAULT_BOARD_ADDRESS = '127.0.0.1:3180';
const DEFAULT_PORT = 3180;

// Jediná adresa, kterou inspektor otevírá. Žádné ovládací endpointy Board Manageru.
export const EVENTS_PATH = '/api/events';

const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

// Přijme "host" nebo "host:port"; schéma ani cestu uživatel nezadává.
export function eventsUrl(address: string): string {
  const value = address.trim();
  const match = /^([^:/\s]+)(?::(\d{1,5}))?$/.exec(value);
  if (!match || !HOST.test(match[1])) throw new Error('Zadejte adresu terče ve tvaru host nebo host:port, např. 127.0.0.1:3180.');
  const port = match[2] === undefined ? DEFAULT_PORT : Number(match[2]);
  if (port < 1 || port > 65535) throw new Error('Port musí být v rozsahu 1–65535.');
  return `ws://${match[1]}:${port}${EVENTS_PATH}`;
}

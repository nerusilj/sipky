export const DEFAULT_BOARD_ADDRESS = '127.0.0.1:3180';
const DEFAULT_PORT = 3180;

// Jediné adresy, které aplikace otevírá. Žádné ovládací endpointy ani /api/config či /api/system s klíči terče.
export const EVENTS_PATH = '/api/events';
export const VERSION_PATH = '/api/version';
export const STATE_PATH = '/api/state';

const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

// Přijme "host" nebo "host:port"; schéma ani cestu uživatel nezadává.
function hostAndPort(address: string): string {
  const match = /^([^:/\s]+)(?::(\d{1,5}))?$/.exec(address.trim());
  if (!match || !HOST.test(match[1])) throw new Error('Zadejte adresu terče ve tvaru host nebo host:port, např. 127.0.0.1:3180.');
  const port = match[2] === undefined ? DEFAULT_PORT : Number(match[2]);
  if (port < 1 || port > 65535) throw new Error('Port musí být v rozsahu 1–65535.');
  return `${match[1]}:${port}`;
}

export function eventsUrl(address: string): string {
  return `ws://${hostAndPort(address)}${EVENTS_PATH}`;
}

// Pouze GET; odpověď je prostý text s verzí Board Manageru.
export function versionUrl(address: string): string {
  return `http://${hostAndPort(address)}${VERSION_PATH}`;
}

export function stateUrl(address: string): string {
  return `http://${hostAndPort(address)}${STATE_PATH}`;
}

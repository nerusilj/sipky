import { versionUrl } from './boardAddress.ts';

// Např. 2.0.2, v1.0.7 nebo 2.1.0-beta.1; jakýkoli jiný text se nezobrazí.
const VERSION = /^v?\d{1,4}(?:\.\d{1,6}){0,3}(?:[-+][0-9A-Za-z.-]{1,32})?$/;

export function parseVersion(text: string): string | undefined {
  const value = text.trim();
  return VERSION.test(value) ? value : undefined;
}

// Jediný HTTP požadavek na Board Manager: GET /api/version. Chyba znamená „neznámá verze“.
export async function fetchBoardVersion(address: string, fetchImpl: typeof fetch = fetch): Promise<string | undefined> {
  try {
    const response = await fetchImpl(versionUrl(address), { method: 'GET', signal: AbortSignal.timeout(5000) });
    return response.ok ? parseVersion(await response.text()) : undefined;
  } catch { return undefined; }
}

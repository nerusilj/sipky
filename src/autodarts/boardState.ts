import { boardThrowValues } from './boardMessages.ts';
import { stateUrl } from './boardAddress.ts';

// Při (znovu)připojení načteme již zapíchnuté šipky, i když terč právě nic neposílá.
// Volající nesmí aplikovat tuto odpověď přes novější živou událost.
export async function fetchBoardState(address: string, fetchImpl: typeof fetch = fetch): Promise<unknown | undefined> {
  try {
    const response = await fetchImpl(stateUrl(address), { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const value = await response.json();
    const data = value?.type === 'state' ? value.data : value;
    if (!data || typeof data !== 'object' || Array.isArray(data) || !boardThrowValues(data)) return;
    return { type: 'state', data };
  } catch { return; }
}

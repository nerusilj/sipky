import { boardStateData, boardThrowValues } from './boardMessages.ts';
import { stateUrl } from './boardAddress.ts';

export async function fetchBoardStateSnapshot(address: string, fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl(stateUrl(address), { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const value = await response.json();
    const payload = value?.type === 'state' ? value : { type: 'state', data: value };
    const data = boardStateData(payload);
    if (data) return { type: 'state', data };
  } catch { return; }
}

// Počáteční hody přijmeme jen z odpovědi s platným seznamem šipek.
export function playableBoardState(payload: Awaited<ReturnType<typeof fetchBoardStateSnapshot>>) {
  if (payload && boardThrowValues(payload.data)) return payload;
}

export async function fetchBoardState(address: string, fetchImpl: typeof fetch = fetch) {
  return playableBoardState(await fetchBoardStateSnapshot(address, fetchImpl));
}

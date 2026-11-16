import { boardStateData } from './boardMessages.ts';
import type { ConnectionState } from './types.ts';

export const STATE_LABELS: Record<ConnectionState, string> = {
  disconnected: 'Nepřipojeno', connecting: 'Připojování…', connected: 'Připojeno', reconnecting: 'Obnovování spojení…',
};

export const BOARD_STATUS_TONES = ['neutral', 'green', 'yellow', 'orange', 'purple', 'red'] as const;
export type BoardStatusDisplay = { label: string; tone: typeof BOARD_STATUS_TONES[number] };

const STATUS_DISPLAY: Record<string, BoardStatusDisplay> = {
  throw: { label: 'Připraven k hodu', tone: 'green' },
  takeout: { label: 'Vyjměte šipky', tone: 'green' },
  takeoutinprogress: { label: 'Vyjímání šipek', tone: 'yellow' },
  stopped: { label: 'Detekce zastavena', tone: 'orange' },
  calibrating: { label: 'Probíhá kalibrace', tone: 'purple' },
  starting: { label: 'Detekce se spouští', tone: 'yellow' },
  stopping: { label: 'Detekce se zastavuje', tone: 'yellow' },
  offline: { label: 'Detekce nedostupná', tone: 'neutral' },
  error: { label: 'Chyba detekce', tone: 'red' },
};

export function readBoardStatus(payload: unknown): string | undefined {
  const status = boardStateData(payload)?.status;
  return typeof status === 'string' && status.trim() ? status.trim() : undefined;
}

export function boardStatusDisplay(status: string): BoardStatusDisplay {
  const key = boardStatusKey(status);
  return (Object.hasOwn(STATUS_DISPLAY, key) ? STATUS_DISPLAY[key] : undefined)
    ?? { label: status, tone: 'neutral' };
}

export function gameBoardStatusDisplay({ state, boardStatus }: { state: ConnectionState; boardStatus?: string }, resetting = false): BoardStatusDisplay {
  const online = state === 'connected';
  const status = online && boardStatus ? boardStatusDisplay(boardStatus)
    : { label: online ? 'Stav detekce neznámý' : STATE_LABELS[state], tone: online || state === 'disconnected' ? 'neutral' : 'yellow' } as const;
  return resetting ? { ...status, label: 'Resetuji terč…' } : status;
}

export function boardStartStopAction(status: string | undefined): 'start' | 'stop' {
  return status && boardStatusKey(status) === 'stopped' ? 'start' : 'stop';
}

function boardStatusKey(status: string): string {
  return status.toLowerCase().replace(/[\s_-]+/g, '');
}

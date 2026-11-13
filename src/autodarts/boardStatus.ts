import { boardStateData } from './boardMessages.ts';

const STATUS_DISPLAY: Record<string, { label: string; tone: string }> = {
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

export function boardStatusDisplay(status: string) {
  const key = boardStatusKey(status);
  return (Object.hasOwn(STATUS_DISPLAY, key) ? STATUS_DISPLAY[key] : undefined)
    ?? { label: status, tone: 'neutral' };
}

export function boardStartStopAction(status: string | undefined): 'start' | 'stop' {
  return status && boardStatusKey(status) === 'stopped' ? 'start' : 'stop';
}

function boardStatusKey(status: string): string {
  return status.toLowerCase().replace(/[\s_-]+/g, '');
}

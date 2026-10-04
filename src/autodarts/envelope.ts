import type { CapturedWsMessage } from '../inspector/types.ts';

// Čteme jen metadata obálky; obsah data zůstává bez interpretace.
export function captureMessage(raw: string, direction: 'in' | 'out', id: number, now = new Date()): CapturedWsMessage {
  let payload: unknown = raw;
  let format: 'json' | 'text' = 'text';
  try { payload = JSON.parse(raw); format = 'json'; } catch { /* Zachovat i neplatný JSON. */ }
  const envelope = payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown> : undefined;
  return {
    id, timestamp: now.toISOString(), direction, payload, raw, format,
    channel: typeof envelope?.channel === 'string' ? envelope.channel : undefined,
    topic: typeof envelope?.topic === 'string' ? envelope.topic : undefined,
  };
}

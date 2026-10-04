import { invoke, isTauri } from '@tauri-apps/api/core';
import { toJsonl } from './messageStore.ts';
import type { CapturedWsMessage } from './types.ts';

export async function saveSession(messages: readonly CapturedWsMessage[]): Promise<boolean> {
  if (!isTauri()) throw new Error('Nativní uložení je dostupné v desktopové aplikaci. Spusťte pnpm tauri:dev.');
  return invoke<boolean>('save_session', { jsonl: toJsonl(messages) });
}

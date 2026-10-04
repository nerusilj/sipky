import { useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { FLUSH_INTERVAL_MS, Recorder } from './inspector/recorder.ts';
import type { RecorderSnapshot } from './inspector/recorder.ts';

// Průběžný záznam na disk běží jen v desktopové aplikaci; jeden soubor na spuštění.
export const recorder = new Recorder(isTauri() ? (session, lines) => invoke<string>('append_recording', { session, lines }) : undefined);
if (isTauri()) window.setInterval(() => { void recorder.flush(); }, FLUSH_INTERVAL_MS);
recorder.meta('start', { app: 'Šipky' });

export function useRecorder(): RecorderSnapshot {
  return useSyncExternalStore(recorder.subscribe, recorder.get);
}

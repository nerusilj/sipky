import { useSyncExternalStore } from 'react';
import type { GameMode } from './activeGame.ts';

const KEY = 'sipky.lastPlayedMode';
const listeners = new Set<() => void>();
let sessionMode: GameMode | undefined;

export const GAME_MODE_LABELS: Record<GameMode, string> = { x01: 'X01', cricket: 'Cricket', shooter: 'Shooter' };

export function parseLastPlayedMode(value: string | null): GameMode | undefined {
  return value === 'x01' || value === 'cricket' || value === 'shooter' ? value : undefined;
}

export function getLastPlayedMode(): GameMode | undefined {
  try { return sessionMode ?? parseLastPlayedMode(localStorage.getItem(KEY)); }
  catch { return sessionMode; }
}

// Volá se až po skutečném startu; prohlížení přípravy poslední hru nepřepisuje.
export function rememberLastPlayedMode(mode: GameMode): void {
  sessionMode = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* Bez úložiště platí jen pro toto spuštění. */ }
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useLastPlayedMode() { return useSyncExternalStore(subscribe, getLastPlayedMode); }

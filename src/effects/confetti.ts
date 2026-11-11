import { playApplause } from '../caller/caller.ts';

// Stejná oslava při každém platném zavření; konfety kreslí komponenta Confetti.
const listeners = new Set<() => void>();

export function celebrate(): void {
  playApplause();
  listeners.forEach(listener => listener());
}

export function onCelebrate(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Salvy z obou spodních rohů: [zpoždění ms, počet konfet na stranu].
export const BURSTS: readonly [number, number][] = [[0, 70], [250, 40]];

import { useSyncExternalStore } from 'react';
import { caller } from '../caller/caller.ts';
import { EFFECTS } from './effectRules.ts';
import type { EffectId, EffectRule } from './effectRules.ts';

export function effectDurationMs(id: EffectId): number {
  const effect: EffectRule = EFFECTS[id];
  return effect.durationMs ?? 3200;
}

export interface ActiveEffect { id: EffectId; key: number }

// Právě zobrazený efekt přes celou obrazovku; nový efekt nahradí předchozí.
let active: ActiveEffect | undefined;
let nextKey = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(value: ActiveEffect | undefined): void {
  active = value;
  listeners.forEach(listener => listener());
}

// Spustí animaci a případnou vlastní hlášku efektu.
export function triggerEffect(id: EffectId, withSound = true): Promise<void> {
  const phrase = EFFECTS[id].phrase;
  const sound = withSound && phrase ? caller.enqueuePhrase(phrase) : Promise.resolve();
  clearTimeout(timer);
  set({ id, key: nextKey++ });
  timer = setTimeout(() => set(undefined), effectDurationMs(id));
  return sound;
}

export function dismissEffect(): void {
  clearTimeout(timer);
  set(undefined);
}

export function subscribeEffect(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getActiveEffect(): ActiveEffect | undefined {
  return active;
}

export function useActiveEffect(): ActiveEffect | undefined {
  return useSyncExternalStore(subscribeEffect, getActiveEffect);
}

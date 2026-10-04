import { useSyncExternalStore } from 'react';
import { caller } from '../caller/caller.ts';
import { EFFECTS } from './effectRules.ts';
import type { EffectId } from './effectRules.ts';

export const EFFECT_DURATION_MS = 3200;

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

// Spustí efekt: zařadí jeho hlášku k hlasateli a zobrazí animaci.
export function triggerEffect(id: EffectId, withSound = true): void {
  if (withSound) caller.enqueuePhrase(EFFECTS[id].phrase);
  clearTimeout(timer);
  set({ id, key: nextKey++ });
  timer = setTimeout(() => set(undefined), EFFECT_DURATION_MS);
}

export function dismissEffect(): void {
  clearTimeout(timer);
  set(undefined);
}

export function useActiveEffect(): ActiveEffect | undefined {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => active);
}

import { useSyncExternalStore } from 'react';

const VENUE_KEY = 'sipky.venueName';
export const DEFAULT_VENUE_NAME = 'HOLICE';
export const MAX_VENUE_NAME = 32;

// Název podniku v horní liště; mění se v Nastavení a pamatuje si ho localStorage.
let venueName = readVenueName();
const listeners = new Set<() => void>();

function readVenueName(): string {
  try { return normalizeVenueName(localStorage.getItem(VENUE_KEY) ?? ''); } catch { return DEFAULT_VENUE_NAME; }
}

export function normalizeVenueName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_VENUE_NAME) || DEFAULT_VENUE_NAME;
}

export function setVenueName(value: string): string {
  venueName = normalizeVenueName(value);
  try { localStorage.setItem(VENUE_KEY, venueName); } catch { /* Název se jen nezapamatuje. */ }
  listeners.forEach(listener => listener());
  return venueName;
}

export function useVenueName(): string {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => venueName);
}

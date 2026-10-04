import { useSyncExternalStore } from 'react';
import { DEFAULT_DART_THEME, isDartThemeId } from './dartThemes.ts';
import type { DartThemeId } from './dartThemes.ts';

const VENUE_KEY = 'sipky.venueName';
const DART_KEY = 'sipky.dartTheme';
export const DEFAULT_VENUE_NAME = 'HOLICE';
export const MAX_VENUE_NAME = 32;

// Vzhled horní lišty; mění se v Nastavení a pamatuje si ho localStorage.
let venueName = normalizeVenueName(read(VENUE_KEY) ?? '');
let dartTheme: DartThemeId = normalizeDartTheme(read(DART_KEY));
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Nastavení se jen nezapamatuje. */ }
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function normalizeVenueName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_VENUE_NAME) || DEFAULT_VENUE_NAME;
}
export function normalizeDartTheme(value: unknown): DartThemeId {
  return isDartThemeId(value) ? value : DEFAULT_DART_THEME;
}

export function setVenueName(value: string): string {
  venueName = normalizeVenueName(value);
  write(VENUE_KEY, venueName);
  return venueName;
}
export function setDartTheme(value: DartThemeId): void {
  dartTheme = normalizeDartTheme(value);
  write(DART_KEY, dartTheme);
}

export function useVenueName(): string { return useSyncExternalStore(subscribe, () => venueName); }
export function useDartTheme(): DartThemeId { return useSyncExternalStore(subscribe, () => dartTheme); }

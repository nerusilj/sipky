import { useSyncExternalStore } from 'react';
import { DEFAULT_DART_THEME, isDartThemeId } from './dartThemes.ts';
import type { DartThemeId } from './dartThemes.ts';
import { DEFAULT_VOICE, isVoiceId } from './caller/voices.ts';
import type { VoiceId } from './caller/voices.ts';
import { isEffectId } from './effects/effectRules.ts';
import type { EffectId } from './effects/effectRules.ts';

const VENUE_KEY = 'sipky.venueName';
const DART_KEY = 'sipky.dartTheme';
const CALLER_KEY = 'sipky.callerEnabled';
const VOICE_KEY = 'sipky.callerVoice';
const EFFECTS_KEY = 'sipky.effectsEnabled';
const DISABLED_EFFECTS_KEY = 'sipky.disabledEffects';
const CONFETTI_KEY = 'sipky.confettiEnabled';
const DEV_KEY = 'sipky.showDev';
const ACCENT_KEY = 'sipky.accent';
export const DEFAULT_ACCENT: DartThemeId = 'orange';
export const DEFAULT_VENUE_NAME = 'HOLICE';
export const MAX_VENUE_NAME = 32;

// Vzhled horní lišty; mění se v Nastavení a pamatuje si ho localStorage.
let venueName = normalizeVenueName(read(VENUE_KEY) ?? '');
let dartTheme: DartThemeId = normalizeDartTheme(read(DART_KEY));
// Hlasatel je ve výchozím stavu zapnutý.
let callerEnabled = read(CALLER_KEY) !== 'false';
let callerVoice: VoiceId = normalizeVoice(read(VOICE_KEY));
// Zábavné efekty: celkový vypínač a seznam jednotlivě vypnutých efektů.
let effectsEnabled = read(EFFECTS_KEY) !== 'false';
let disabledEffects: readonly EffectId[] = parseDisabledEffects(read(DISABLED_EFFECTS_KEY));
let confettiEnabled = read(CONFETTI_KEY) !== 'false';
// Sekce DEV (inspektor, kontrola hlášení a efektů) je v menu jen po zapnutí v Nastavení.
let showDev = read(DEV_KEY) === 'true';
// Barva aplikace ze stejné palety jako šipka; výchozí oranžová.
const storedAccent = read(ACCENT_KEY);
let accent: DartThemeId = isDartThemeId(storedAccent) ? storedAccent : DEFAULT_ACCENT;
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

export function setCallerEnabled(value: boolean): void {
  callerEnabled = value;
  write(CALLER_KEY, String(value));
}
export function isCallerEnabled(): boolean { return callerEnabled; }

export function normalizeVoice(value: unknown): VoiceId {
  return isVoiceId(value) ? value : DEFAULT_VOICE;
}
export function setCallerVoice(value: VoiceId): void {
  callerVoice = normalizeVoice(value);
  write(VOICE_KEY, callerVoice);
}
export function getCallerVoice(): VoiceId { return callerVoice; }
export function useCallerVoice(): VoiceId { return useSyncExternalStore(subscribe, () => callerVoice); }

export function parseDisabledEffects(value: string | null): EffectId[] {
  try {
    const list: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(list) ? [...new Set(list.filter(isEffectId))] : [];
  } catch { return []; }
}
export function setEffectsEnabled(value: boolean): void {
  effectsEnabled = value;
  write(EFFECTS_KEY, String(value));
}
export function setEffectEnabled(id: EffectId, value: boolean): void {
  disabledEffects = value ? disabledEffects.filter(other => other !== id) : [...new Set([...disabledEffects, id])];
  write(DISABLED_EFFECTS_KEY, JSON.stringify(disabledEffects));
}
// Spustí se efekt automaticky z terče? (ruční vyzkoušení v Nastavení/DEV funguje vždy)
export function isEffectActive(id: EffectId): boolean { return effectsEnabled && !disabledEffects.includes(id); }
// Konfety po vyhraném legu a zápasu; patří mezi zábavné efekty, takže je vypíná i hlavní vypínač.
export function setConfettiEnabled(value: boolean): void {
  confettiEnabled = value;
  write(CONFETTI_KEY, String(value));
}
export function isConfettiActive(): boolean { return effectsEnabled && confettiEnabled; }
export function useConfettiEnabled(): boolean { return useSyncExternalStore(subscribe, () => confettiEnabled); }
export function setAccent(value: DartThemeId): void {
  accent = isDartThemeId(value) ? value : DEFAULT_ACCENT;
  write(ACCENT_KEY, accent);
}
export function useAccent(): DartThemeId { return useSyncExternalStore(subscribe, () => accent); }

export function setShowDev(value: boolean): void {
  showDev = value;
  write(DEV_KEY, String(value));
}
export function useShowDev(): boolean { return useSyncExternalStore(subscribe, () => showDev); }
export function useEffectsEnabled(): boolean { return useSyncExternalStore(subscribe, () => effectsEnabled); }
export function useDisabledEffects(): readonly EffectId[] { return useSyncExternalStore(subscribe, () => disabledEffects); }

export function useVenueName(): string { return useSyncExternalStore(subscribe, () => venueName); }
export function useCallerEnabled(): boolean { return useSyncExternalStore(subscribe, () => callerEnabled); }
export function useDartTheme(): DartThemeId { return useSyncExternalStore(subscribe, () => dartTheme); }

import { useSyncExternalStore } from 'react';
import { MAX_VISIT_SCORE } from './czechNumbers.ts';
import { isVoiceId } from './voices.ts';
import type { VoiceId } from './voices.ts';
import type { BoardEvent, Dart } from './visitTracker.ts';
import { getCallerVoice } from '../settings.ts';

export interface AnnouncedVisit { at: number; darts: Dart[]; total: number }
export interface CallerSnapshot { playing?: number; sequence: boolean; error?: string; log: readonly AnnouncedVisit[] }

const LOG_SIZE = 20;

// Nahrávky leží v public/sounds/cs/<hlas>/score; lze je nahradit vlastními se stejnými názvy.
export function scoreSoundUrl(total: number, voice: VoiceId): string {
  if (!Number.isInteger(total) || total < 0 || total > MAX_VISIT_SCORE) throw new RangeError(`Součet kola mimo rozsah: ${total}`);
  if (!isVoiceId(voice)) throw new RangeError(`Neznámý hlas: ${String(voice)}`);
  return `/sounds/cs/${voice}/score/${total}.wav`;
}

// Hlasatel: po ohlášeném kole přehraje součet, pokud je zapnutý; v DEV umí přehrát libovolné hlášení.
class Caller {
  private audio?: HTMLAudioElement;
  private snapshot: CallerSnapshot = { sequence: false, log: [] };
  private readonly listeners = new Set<() => void>();
  private stopSequence?: () => void;

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  handle(event: BoardEvent, enabled: boolean): void {
    if (event.kind !== 'visit') return;
    this.update({ log: [{ at: Date.now(), darts: event.darts, total: event.total }, ...this.snapshot.log].slice(0, LOG_SIZE) });
    if (enabled) void this.play(event.total);
  }

  // Přehraje jedno hlášení zvoleným (nebo zadaným) hlasem; předchozí přeruší. Vrací se po dohrání nebo chybě.
  play(total: number, voice: VoiceId = getCallerVoice()): Promise<void> {
    this.stopSequence?.();
    return this.playOne(total, voice);
  }

  // Přehraje postupně hlášení from..to (kontrola nahrávek v DEV).
  async playRange(from: number, to: number): Promise<void> {
    this.stopSequence?.();
    let stopped = false;
    this.stopSequence = () => { stopped = true; this.stopSequence = undefined; this.update({ sequence: false }); };
    this.update({ sequence: true });
    const voice = getCallerVoice();
    for (let n = from; n <= to && !stopped; n++) await this.playOne(n, voice);
    if (!stopped) this.stopSequence?.();
  }

  stop(): void {
    this.stopSequence?.();
    this.audio?.pause(); this.audio = undefined;
    this.update({ playing: undefined });
  }

  private playOne(total: number, voice: VoiceId): Promise<void> {
    this.audio?.pause();
    const audio = new Audio(scoreSoundUrl(total, voice));
    this.audio = audio;
    this.update({ playing: total, error: undefined });
    return new Promise(resolve => {
      const done = (error?: string) => {
        if (this.audio === audio) { this.audio = undefined; this.update({ playing: undefined, ...(error ? { error } : {}) }); }
        resolve();
      };
      audio.onended = () => done();
      audio.onerror = () => done(`Nahrávku ${total} nelze přehrát.`);
      audio.onpause = () => { if (!audio.ended) done(); };
      audio.play().catch((error: unknown) => done(error instanceof Error && error.name === 'NotAllowedError'
        ? 'Přehrávání zablokoval prohlížeč. Klikněte kamkoli do aplikace a zkuste to znovu.' : `Nahrávku ${total} nelze přehrát.`));
    });
  }

  private update(patch: Partial<CallerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
}

export const caller = new Caller();
export function useCaller(): CallerSnapshot {
  return useSyncExternalStore(caller.subscribe, caller.get);
}

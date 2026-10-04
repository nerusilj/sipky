import { useSyncExternalStore } from 'react';
import { MAX_VISIT_SCORE } from './czechNumbers.ts';
import { phraseSoundUrl } from './phrases.ts';
import type { PhraseId } from './phrases.ts';
import { isVoiceId } from './voices.ts';
import type { VoiceId } from './voices.ts';
import type { BoardEvent, Dart } from './visitTracker.ts';
import { getCallerVoice } from '../settings.ts';

export interface AnnouncedVisit { at: number; darts: Dart[]; total: number; effect?: string }
export interface CallerSnapshot { playing?: string; sequence: boolean; error?: string; log: readonly AnnouncedVisit[] }
interface Sound { url: string; label: string }

const LOG_SIZE = 20;

// Nahrávky leží v public/sounds/cs/<hlas>/score; lze je nahradit vlastními se stejnými názvy.
export function scoreSoundUrl(total: number, voice: VoiceId): string {
  if (!Number.isInteger(total) || total < 0 || total > MAX_VISIT_SCORE) throw new RangeError(`Součet kola mimo rozsah: ${total}`);
  if (!isVoiceId(voice)) throw new RangeError(`Neznámý hlas: ${String(voice)}`);
  return `/sounds/cs/${voice}/score/${total}.wav`;
}

// Hlasatel: automatická hlášení z terče řadí do fronty (nepřekřikují se),
// ruční přehrání v DEV nebo Nastavení frontu přeruší.
class Caller {
  private audio?: HTMLAudioElement;
  private snapshot: CallerSnapshot = { sequence: false, log: [] };
  private readonly listeners = new Set<() => void>();
  private readonly queue: Sound[] = [];
  private draining = false;
  private stopSequence?: () => void;

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  // Ohlášené kolo: zapíše do přehledu a případně zařadí hlášení součtu.
  handle(event: BoardEvent, speak: boolean, effect?: string): void {
    if (event.kind !== 'visit') return;
    this.update({ log: [{ at: Date.now(), darts: event.darts, total: event.total, effect }, ...this.snapshot.log].slice(0, LOG_SIZE) });
    if (speak) this.enqueue({ url: scoreSoundUrl(event.total, getCallerVoice()), label: String(event.total) });
  }

  // Hláška efektu do fronty (zazní před případným součtem).
  enqueuePhrase(id: PhraseId): void {
    this.enqueue({ url: phraseSoundUrl(id, getCallerVoice()), label: id });
  }

  play(total: number, voice: VoiceId = getCallerVoice()): Promise<void> {
    this.interrupt();
    return this.playSound({ url: scoreSoundUrl(total, voice), label: String(total) });
  }

  playPhrase(id: PhraseId, voice: VoiceId = getCallerVoice()): Promise<void> {
    this.interrupt();
    return this.playSound({ url: phraseSoundUrl(id, voice), label: id });
  }

  // Přehraje postupně hlášení from..to (kontrola nahrávek v DEV).
  async playRange(from: number, to: number): Promise<void> {
    this.interrupt();
    let stopped = false;
    this.stopSequence = () => { stopped = true; this.stopSequence = undefined; this.update({ sequence: false }); };
    this.update({ sequence: true });
    const voice = getCallerVoice();
    for (let n = from; n <= to && !stopped; n++) await this.playSound({ url: scoreSoundUrl(n, voice), label: String(n) });
    if (!stopped) this.stopSequence?.();
  }

  stop(): void {
    this.interrupt();
    this.audio?.pause(); this.audio = undefined;
    this.update({ playing: undefined });
  }

  private interrupt(): void {
    this.stopSequence?.();
    this.queue.length = 0;
  }

  private enqueue(sound: Sound): void {
    this.queue.push(sound);
    if (!this.draining) void this.drain();
  }

  private async drain(): Promise<void> {
    this.draining = true;
    while (this.queue.length) await this.playSound(this.queue.shift()!);
    this.draining = false;
  }

  private playSound({ url, label }: Sound): Promise<void> {
    this.audio?.pause();
    const audio = new Audio(url);
    this.audio = audio;
    this.update({ playing: label, error: undefined });
    return new Promise(resolve => {
      const done = (error?: string) => {
        if (this.audio === audio) { this.audio = undefined; this.update({ playing: undefined, ...(error ? { error } : {}) }); }
        resolve();
      };
      audio.onended = () => done();
      audio.onerror = () => done(`Nahrávku ${label} nelze přehrát.`);
      audio.onpause = () => { if (!audio.ended) done(); };
      audio.play().catch((error: unknown) => done(error instanceof Error && error.name === 'NotAllowedError'
        ? 'Přehrávání zablokoval prohlížeč. Klikněte kamkoli do aplikace a zkuste to znovu.' : `Nahrávku ${label} nelze přehrát.`));
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

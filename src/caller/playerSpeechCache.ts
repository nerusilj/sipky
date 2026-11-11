import type { VoiceId } from './voices.ts';

export const normalizeSpokenName = (name: string): string => name.normalize('NFC').replace(/\s+/g, ' ').trim();
export const playerSpeechKey = (name: string, voice: VoiceId): string => JSON.stringify([voice, normalizeSpokenName(name)]);
export interface SpeechPreparation { pending: number; error?: string }

// Jedna úloha naráz, sdílené požadavky a omezená paměť. Diskovou cache spravuje lokální worker.
export class PlayerSpeechCache {
  private readonly ready = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string | undefined>>();
  private queue: Promise<unknown> = Promise.resolve();
  private state: SpeechPreparation = { pending: 0 };
  private readonly listeners = new Set<() => void>();
  private readonly generate: (name: string, voice: VoiceId) => Promise<string | undefined>;
  private readonly release: (url: string) => void;
  private readonly capacity: number;
  constructor(generate: (name: string, voice: VoiceId) => Promise<string | undefined>,
    release: (url: string) => void = () => {}, capacity = 64) {
    this.generate = generate; this.release = release; this.capacity = capacity;
  }
  get = (): SpeechPreparation => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  prepare(name: string, voice: VoiceId): Promise<string | undefined> {
    name = normalizeSpokenName(name);
    if (!name || name.length > 24) return Promise.resolve(undefined);
    const key = playerSpeechKey(name, voice);
    const cached = this.ready.get(key);
    if (cached) { this.ready.delete(key); this.ready.set(key, cached); return Promise.resolve(cached); }
    const running = this.pending.get(key);
    if (running) return running;
    const job = this.queue.then(() => this.generate(name, voice)).then(url => {
      if (url) {
        this.ready.set(key, url);
        while (this.ready.size > this.capacity) {
          const oldest = this.ready.entries().next().value!;
          this.ready.delete(oldest[0]); this.release(oldest[1]);
        }
      }
      this.state = { ...this.state, error: undefined };
      return url;
    }).catch(() => {
      this.state = { ...this.state, error: 'Hlášení jmen není připravené. Ověřte, že je vedle aplikace složka tts, a zkuste to znovu.' };
      return undefined;
    }).finally(() => { this.pending.delete(key); this.publish(); });
    this.pending.set(key, job);
    this.queue = job;
    this.publish();
    return job;
  }
  private publish(): void {
    this.state = { ...this.state, pending: this.pending.size };
    this.listeners.forEach(listener => listener());
  }
}

import { useSyncExternalStore } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { loadAudioSource } from './audioSource.ts';
import { MAX_VISIT_SCORE } from './czechNumbers.ts';
import { phraseSoundUrl } from './phrases.ts';
import type { PhraseId } from './phrases.ts';
import { isVoiceId } from './voices.ts';
import type { VoiceId } from './voices.ts';
import type { BoardEvent, Dart } from './visitTracker.ts';
import { getCallerVoice, isCallerEnabled, isSoundEnabled, subscribeSoundEnabled } from '../settings.ts';
import { playerSpeech } from './playerSpeech.ts';
import { TURN_SOUNDS } from './turnSounds.ts';
import type { TurnSound } from './turnSounds.ts';

export interface AnnouncedVisit { at: number; darts: Dart[]; total: number; effect?: string }
export interface CallerSnapshot { playing?: string; sequence: boolean; error?: string; log: readonly AnnouncedVisit[] }
interface Sound { url: string; label: string; finished?: () => void; valid?: () => boolean; player?: boolean }

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
  private playerRevision = 0;
  private playingPlayer = false;
  private playbackRevision = 0;

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  // Ohlášené kolo: zapíše do přehledu a případně zařadí hlášení součtu.
  handle(event: BoardEvent, speak: boolean, effect?: string): Promise<void> {
    if (event.kind !== 'visit') return Promise.resolve();
    this.update({ log: [{ at: Date.now(), darts: event.darts, total: event.total, effect }, ...this.snapshot.log].slice(0, LOG_SIZE) });
    return speak ? this.enqueue({ url: scoreSoundUrl(event.total, getCallerVoice()), label: String(event.total) }) : Promise.resolve();
  }

  // Hláška efektu do fronty (zazní před případným součtem).
  enqueuePhrase(id: PhraseId): Promise<void> {
    return this.enqueue({ url: phraseSoundUrl(id, getCallerVoice()), label: id });
  }

  enqueueTurnSound(id: TurnSound, valid: () => boolean = () => true): Promise<void> {
    return valid() ? this.enqueue({ ...TURN_SOUNDS[id], valid }) : Promise.resolve();
  }

  // Bez jména přehraje pouze úvod hry; boti se k terči nevolají.
  async enqueuePlayer(name: string | undefined, stillCurrent: () => boolean, gameStart = false): Promise<void> {
    const revision = this.playerRevision, voice = getCallerVoice();
    const valid = () => revision === this.playerRevision && voice === getCallerVoice() && isSoundEnabled() && isCallerEnabled() && stillCurrent();
    if (!valid()) return;
    if (gameStart) {
      await this.enqueue({ url: phraseSoundUrl('gameon', voice), label: 'Hra začíná!', valid, player: true });
      if (!valid()) return;
    }
    if (!name) return;
    const url = await playerSpeech.prepare(name, voice);
    if (url && valid()) await this.enqueue({ url, label: `Hraje ${name}`, valid, player: true });
  }

  cancelPlayer(): void {
    this.playerRevision++;
    for (let index = this.queue.length - 1; index >= 0; index--) {
      if (this.queue[index].player) this.queue.splice(index, 1)[0].finished?.();
    }
    if (this.playingPlayer) { this.audio?.pause(); this.audio = undefined; this.playingPlayer = false; this.update({ playing: undefined }); }
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
    this.playbackRevision++;
    this.cancelPlayer();
    this.stopSequence?.();
    this.queue.splice(0).forEach(sound => sound.finished?.());
  }

  private enqueue(sound: Sound): Promise<void> {
    if (!isSoundEnabled()) return Promise.resolve();
    return new Promise(resolve => {
      this.queue.push({ ...sound, finished: resolve });
      if (!this.draining) void this.drain();
    });
  }

  private async drain(): Promise<void> {
    this.draining = true;
    while (this.queue.length) {
      const sound = this.queue.shift()!;
      try { if (!sound.valid || sound.valid()) await this.playSound(sound); }
      catch { this.update({ error: `Nahrávku ${sound.label} nelze přehrát.` }); }
      finally { sound.finished?.(); }
    }
    this.draining = false;
  }

  private async playSound({ url, label, player = false, valid }: Sound): Promise<void> {
    if (!isSoundEnabled()) return Promise.resolve();
    this.audio?.pause();
    const revision = ++this.playbackRevision;
    let source: Awaited<ReturnType<typeof loadAudioSource>>;
    try { source = isTauri() ? await loadAudioSource(url, true) : { url, release: () => {} }; }
    catch {
      if (revision === this.playbackRevision) this.update({ error: `Nahrávku ${label} nelze načíst.` });
      return;
    }
    if (revision !== this.playbackRevision || !isSoundEnabled() || (valid && !valid())) { source.release(); return; }
    const audio = new Audio(source.url);
    this.audio = audio;
    this.playingPlayer = player;
    this.update({ playing: label, error: undefined });
    return new Promise(resolve => {
      let settled = false;
      const timeout = setTimeout(() => { done(`Nahrávku ${label} se nepodařilo dokončit.`); audio.pause(); }, 10000);
      const done = (error?: string) => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        source.release();
        if (this.audio === audio) { this.audio = undefined; this.playingPlayer = false; this.update({ playing: undefined, ...(error ? { error } : {}) }); }
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
const checkoutSound = new Caller();

// Fanfára běží souběžně s hlasatelem a nečeká na jeho frontu.
export function playCheckoutSound(): void {
  checkoutSound.stop();
  void checkoutSound.enqueueTurnSound('checkout');
}

subscribeSoundEnabled(enabled => {
  if (!enabled) {
    caller.stop();
    checkoutSound.stop();
  }
});
export function useCaller(): CallerSnapshot {
  return useSyncExternalStore(caller.subscribe, caller.get);
}

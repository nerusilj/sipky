import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>([['sipky.soundEnabled', 'false']]);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
} });
class AudioStub {
  static instances: AudioStub[] = [];
  onended?: () => void; onpause?: () => void; onerror?: () => void;
  ended = false;
  paused = false;
  readonly url: string;
  constructor(url: string) { this.url = url; AudioStub.instances.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.onended?.(); }
}
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioStub });
const { caller } = await import('../src/caller/caller.ts');
const { celebrate } = await import('../src/effects/confetti.ts');
const { isSoundEnabled, setSoundEnabled, isCallerEnabled, getCallerVoice, isEffectActive } = await import('../src/settings.ts');

test('ztišení se načte z nastavení, umlčí všechny nahrávky a zachová nastavení hlasatele a efektů', async () => {
  assert.equal(isSoundEnabled(), false);
  const preferences = [isCallerEnabled(), getCallerVoice(), isEffectActive('ambrozovina')];
  const visit = { kind: 'visit' as const, darts: [], total: 60 };
  await caller.handle(visit, true);
  await caller.enqueuePhrase('ambrozovina');
  await caller.enqueueTurnSound('bust');
  await caller.enqueueTurnSound('miss');
  celebrate();
  await caller.play(180);
  await caller.playPhrase('ambrozovina');
  await caller.enqueuePlayer('Radek', () => true);
  assert.equal(AudioStub.instances.length, 0);
  assert.equal(caller.get().log[0].total, 60);

  setSoundEnabled(true);
  const active = caller.handle(visit, true);
  const queued = caller.enqueuePhrase('ambrozovina');
  assert.equal(AudioStub.instances.length, 1);
  celebrate();
  assert.equal(AudioStub.instances.length, 2);
  assert.equal(AudioStub.instances[1].url, '/sounds/game/applause.wav');
  assert.equal(AudioStub.instances[0].paused, false, 'fanfára nepřeruší hlášení skóre');
  setSoundEnabled(false);
  assert.equal(AudioStub.instances[0].paused, true);
  assert.equal(AudioStub.instances[1].paused, true);
  await Promise.all([active, queued]);
  assert.equal(AudioStub.instances.length, 2);
  assert.equal(caller.get().playing, undefined);
  assert.equal(storage.get('sipky.soundEnabled'), 'false');
  assert.deepEqual([isCallerEnabled(), getCallerVoice(), isEffectActive('ambrozovina')], preferences);

  setSoundEnabled(true);
  const resumed = caller.handle(visit, true);
  assert.equal(AudioStub.instances.length, 3);
  AudioStub.instances[2].finish();
  await resumed;
  assert.equal(storage.get('sipky.soundEnabled'), 'true');
});

test('vypnutí zvuku při načítání desktopového WAV zabrání opožděnému přehrání', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalTauri = Object.getOwnPropertyDescriptor(globalThis, 'isTauri');
  const before = AudioStub.instances.length;
  let complete!: (response: ArrayBuffer) => void;
  try {
    Object.defineProperty(globalThis, 'isTauri', { configurable: true, value: true });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { __TAURI_INTERNALS__: { invoke: () => new Promise(resolve => { complete = resolve; }) } } });
    setSoundEnabled(true);
    const playing = caller.play(180);
    setSoundEnabled(false);
    complete(new Uint8Array([82,73,70,70,4,0,0,0,87,65,86,69]).buffer);
    await playing;
    assert.equal(AudioStub.instances.length, before);
    assert.equal(caller.get().playing, undefined);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalTauri) Object.defineProperty(globalThis, 'isTauri', originalTauri);
    else Reflect.deleteProperty(globalThis, 'isTauri');
  }
});

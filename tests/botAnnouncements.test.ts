import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { caller } from '../src/caller/caller.ts';
import { playerSpeech } from '../src/caller/playerSpeech.ts';
import { setSoundEnabled, setCallerEnabled, setCallerVoice, setEffectsEnabled } from '../src/settings.ts';
import * as x01 from '../src/game/gameStore.ts';
import * as cricket from '../src/game/cricketStore.ts';
import { BOT_PLAYERS } from '../src/game/bots.ts';
import type { GamePlayer } from '../src/game/x01.ts';

class AudioStub {
  static all: AudioStub[] = [];
  onended?: () => void; onpause?: () => void; onerror?: () => void;
  ended = false; paused = false;
  readonly url: string;
  constructor(url: string) { this.url = url; AudioStub.all.push(this); }
  play() { if (!this.url.endsWith('/gameon.wav')) queueMicrotask(() => this.finish()); return Promise.resolve(); }
  finish() { this.ended = true; this.onended?.(); }
  pause() { this.paused = true; this.onpause?.(); }
}
const human = { id: 'human', name: 'Radek', color: '#ffffff' };
const modes = [
  { name: 'X01', start: (players: GamePlayer[]) => x01.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players), end: x01.endGame, get: x01.getGameSnapshot, next: x01.nextPlayer },
  { name: 'Cricket', start: (players: GamePlayer[]) => cricket.startCricket({ legsToWin: 1 }, players), end: cricket.endCricket, get: cricket.getCricketSnapshot, next: cricket.nextCricketPlayer },
];
for (const mode of modes) test(`${mode.name}: bot se neohlásí ani negeneruje jméno; úvod, jeho hra a volání člověka fungují`, async t => {
  mode.end(); caller.stop();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(Math, 'random', () => 0);
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioStub });
  const names: string[] = [];
  t.mock.method(playerSpeech, 'prepare', async (name: string) => { names.push(name); return `/names/${name}.wav`; });
  setSoundEnabled(true); setCallerEnabled(true); setCallerVoice('eliska'); setEffectsEnabled(false); AudioStub.all = [];
  const tick = async (ms: number) => { t.mock.timers.tick(ms); await turn(); };
  try {
    mode.start([BOT_PLAYERS[2], human]); await turn();
    assert.deepEqual(AudioStub.all.map(audio => audio.url), ['/sounds/cs/eliska/fun/gameon.wav']);
    await tick(1500); assert.equal(mode.get().game?.current.length, 0, 'bot čeká na doznění úvodu');
    AudioStub.all[0].finish(); await turn(); await tick(900);
    assert.equal(mode.get().game?.current.length, 1, 'bot po úvodu začne házet');
    for (let i = 0; i < 12 && mode.get().state?.current === 0; i++) await tick(500);
    assert.equal(mode.get().state?.current, 1);
    assert.equal(AudioStub.all.at(-1)?.url, '/names/Radek.wav');
    assert.ok(names.length > 0); assert.ok(names.every(name => name === 'Radek'), 'jméno bota se ani negeneruje');
    if (mode.name === 'X01') assert.ok(AudioStub.all.some(audio => audio.url.endsWith('/score/180.wav')), 'skóre bota se dál hlásí');
    else assert.ok(!AudioStub.all.some(audio => audio.url.includes('/score/')), 'Cricket dál nehlásí součty');
    const namesBefore = AudioStub.all.filter(audio => audio.url.startsWith('/names/')).length;
    mode.next();
    for (let i = 0; i < 4; i++) await tick(500);
    assert.equal(mode.get().state?.current, 0);
    assert.equal(AudioStub.all.filter(audio => audio.url.startsWith('/names/')).length, namesBefore, 'při dalším tahu je bot znovu tichý');
    assert.equal(AudioStub.all.filter(audio => audio.url.endsWith('/gameon.wav')).length, 1);
  } finally { mode.end(); caller.stop(); t.mock.timers.reset(); }
});

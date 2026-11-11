import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { caller } from '../src/caller/caller.ts';
import { playerSpeech } from '../src/caller/playerSpeech.ts';
import { setSoundEnabled, setCallerEnabled, setCallerVoice } from '../src/settings.ts';
import * as x01 from '../src/game/gameStore.ts';
import * as cricket from '../src/game/cricketStore.ts';
import { makeDart } from '../src/game/x01.ts';
class AudioStub {
  static all: AudioStub[] = [];
  readonly url: string;
  onended?: () => void; onpause?: () => void; onerror?: () => void;
  paused = false; ended = false;
  constructor(url: string) { this.url = url; AudioStub.all.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.onended?.(); }
}
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioStub });
playerSpeech.prepare = async (name, voice) => `/names/${voice}/${name}.wav`;
const players = ['Radek', 'Petr'].map((name, i) => ({ id: String(i), name, color: '#ffffff' }));
const modes = [
  { name: 'X01', start: () => x01.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players), end: x01.endGame, next: x01.nextPlayer, undo: x01.undoDart, rematch: x01.rematch, hit: x01.enterDart },
  { name: 'Cricket', start: () => cricket.startCricket({ legsToWin: 1 }, players), end: cricket.endCricket, next: cricket.nextCricketPlayer, undo: cricket.undoCricketDart, rematch: cricket.rematchCricket, hit: cricket.enterCricketDart },
];
function reset() { x01.endGame(); cricket.endCricket(); caller.stop(); setSoundEnabled(true); setCallerEnabled(true); setCallerVoice('eliska'); AudioStub.all = []; }
for (const mode of modes) {
  test(`${mode.name}: Hra začíná před jménem, jen při nové hře a odvetě`, async () => {
    reset(); mode.start();
    try {
      await wait(15); assert.deepEqual(AudioStub.all.map(a => a.url), ['/sounds/cs/eliska/fun/gameon.wav']);
      AudioStub.all[0].finish(); await wait(15);
      assert.equal(AudioStub.all[1]?.url, '/names/eliska/Radek.wav'); AudioStub.all[1].finish();
      mode.next(); await wait(550);
      const result = AudioStub.all.at(-1);
      if (result?.url.includes('/score/')) result.finish();
      await wait(650);
      assert.equal(AudioStub.all.at(-1)?.url, '/names/eliska/Petr.wav');
      assert.equal(AudioStub.all.filter(a => a.url.endsWith('/gameon.wav')).length, 1);
      mode.rematch(); await wait(15); assert.ok(AudioStub.all.at(-1)?.url.endsWith('/gameon.wav'));
      AudioStub.all.at(-1)!.finish(); await wait(15); assert.equal(AudioStub.all.at(-1)?.url, '/names/eliska/Petr.wav');
      assert.equal(AudioStub.all.filter(a => a.url.endsWith('/gameon.wav')).length, 2);
    } finally { mode.end(); }
  });
  test(`${mode.name}: ukončení, Zpět i první hod zruší opožděné jméno po úvodu`, async () => {
    reset(); mode.start(); await wait(10); const opening = AudioStub.all[0]; mode.end(); await wait(10);
    assert.equal(opening.paused, true); assert.equal(AudioStub.all.length, 1);
    reset(); mode.start(); await wait(10); mode.undo(); await wait(10); assert.equal(AudioStub.all.length, 1); mode.end();
    reset(); mode.start(); await wait(10); mode.hit(makeDart(20, 1)); AudioStub.all[0].finish(); await wait(10);
    assert.equal(AudioStub.all.length, 1); mode.end();
  });
}
test('Úvod používá vybraný hlas a respektuje ztišení i vypnutého hlasatele', async () => {
  reset();
  try {
    setCallerVoice('martin'); modes[0].start(); await wait(10);
    assert.equal(AudioStub.all[0]?.url, '/sounds/cs/martin/fun/gameon.wav');
    AudioStub.all[0].finish(); await wait(10); assert.equal(AudioStub.all[1]?.url, '/names/martin/Radek.wav'); modes[0].end();
    AudioStub.all = []; setSoundEnabled(false); modes[1].start(); await wait(10); assert.equal(AudioStub.all.length, 0); modes[1].end();
    setSoundEnabled(true); setCallerEnabled(false); modes[0].start(); await wait(10); assert.equal(AudioStub.all.length, 0); modes[0].end();
    setCallerEnabled(true); modes[1].start(); await wait(10); setSoundEnabled(false); await wait(10);
    assert.equal(AudioStub.all.length, 1); assert.equal(AudioStub.all[0].paused, true);
  } finally { reset(); }
});
test('Chyba úvodní nahrávky nezablokuje jméno a nové zahájení neohlásí starého hráče', async () => {
  reset();
  try {
    modes[0].start(); await wait(10); AudioStub.all[0].onerror?.(); await wait(10);
    assert.equal(AudioStub.all[1]?.url, '/names/eliska/Radek.wav'); modes[0].end();
    AudioStub.all = []; modes[1].start(); await wait(10); modes[1].rematch(); await wait(10);
    assert.equal(AudioStub.all[0].paused, true); assert.equal(AudioStub.all.length, 2);
    AudioStub.all[1].finish(); await wait(10);
    assert.equal(AudioStub.all[2]?.url, '/names/eliska/Petr.wav');
  } finally { reset(); }
});

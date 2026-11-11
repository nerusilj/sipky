import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { makeDart } from '../src/game/x01.ts';
import type { Dart } from '../src/game/x01.ts';
import { caller } from '../src/caller/caller.ts';
import { playerSpeech } from '../src/caller/playerSpeech.ts';
import { setSoundEnabled } from '../src/settings.ts';
import * as store from '../src/game/cricketStore.ts';
import { endAnyGame, hasAnyGame, isAnyGameRunning, feedActiveGame } from '../src/game/activeGame.ts';
import { hasGame, startGame } from '../src/game/gameStore.ts';
class AudioStub {
  static urls: string[] = [];
  onended?: () => void; onpause?: () => void; onerror?: () => void;
  ended = false;
  readonly url: string;
  constructor(url: string) { this.url = url; AudioStub.urls.push(url); }
  play() { queueMicrotask(() => { this.ended = true; this.onended?.(); }); return Promise.resolve(); }
  pause() { this.onpause?.(); }
}
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioStub });
playerSpeech.prepare = async name => `/names/${name}.wav`;
const players = ['Radek', 'Petr'].map((name, i) => ({ id: String(i), name, color: '#ffffff' }));
const T = (n: number) => makeDart(n, 3), S = (n: number) => makeDart(n, 1), D = (n: number) => makeDart(n, 2);
const frame = (darts: Dart[] = [], event = 'Throw detected') => ({ type: 'state', data: { connected: true, running: true, event, numThrows: darts.length, throws: darts.map(({ name, number, multiplier }) => ({ segment: { name, number, multiplier } })) } });
function start(solo = false, legs = 1) { store.endCricket(); store.feedCricketFromBoard(frame()); AudioStub.urls = []; setSoundEnabled(false); store.startCricket({ legsToWin: legs }, solo ? players.slice(0, 1) : players); }
async function manual(darts: Dart[]) { darts.forEach(store.enterCricketDart); store.nextCricketPlayer(); await wait(1150); }

test('Cricket ručně: zásahy ani body se nehlásí, čeká na Další a oznámí dalšího hráče', async () => {
  start(); setSoundEnabled(true);
  try {
    [T(20), T(20), T(20)].forEach(store.enterCricketDart);
    await wait(650);
    assert.equal(store.getCricketSnapshot().state?.current, 0); assert.equal(store.getCricketSnapshot().state?.points[0], 120);
    assert.ok(!AudioStub.urls.some(url => url.includes('/score/')));
    assert.ok(!AudioStub.urls.some(url => url.includes('/score/180.wav')));
    store.nextCricketPlayer(); await wait(1150);
    assert.equal(store.getCricketSnapshot().state?.current, 1); assert.equal(store.getCricketSnapshot().state?.history.length, 1);
    assert.ok(!AudioStub.urls.some(url => url.includes('/score/'))); assert.ok(AudioStub.urls.includes('/names/Petr.wav'));
  } finally { store.endCricket(); }
});
test('Cricket ručně: oprava první šipky zachová ostatní a Zpět zruší čekající přepnutí', async () => {
  start();
  try {
    [T(20), S(20), S(19)].forEach(store.enterCricketDart);
    store.replaceCricketDart(0, S(15));
    assert.deepEqual(store.getCricketSnapshot().game?.current.map(d => d.name), ['S15', 'S20', 'S19']);
    assert.equal(store.getCricketSnapshot().state?.points[0], 0);
    store.nextCricketPlayer(); store.undoCricketDart(); await wait(1150);
    assert.equal(store.getCricketSnapshot().state?.current, 0); assert.equal(store.getCricketSnapshot().state?.history.length, 0); assert.equal(store.getCricketSnapshot().game?.current.length, 2);
  } finally { store.endCricket(); }
});
test('Cricket ručně: vítězný hod automaticky připíše leg, další leg vyhlásí vítěze, Zpět ho vrátí', async () => {
  start(true, 2);
  try {
    for (let leg = 1; leg <= 2; leg++) {
      await manual([T(20), T(19), T(18)]); await manual([T(17), T(16), T(15)]);
      store.enterCricketDart(D(25)); store.enterCricketDart(S(25));
      assert.equal(store.getCricketSnapshot().state?.visitResult.checkout, true); assert.equal(store.getCricketSnapshot().state?.legsWon[0], leg - 1);
      await wait(1150); assert.equal(store.getCricketSnapshot().state?.legsWon[0], leg);
    }
    assert.equal(store.getCricketSnapshot().state?.winner, 0); assert.equal(store.isCricketRunning(), false);
    store.undoCricketDart(); assert.equal(store.getCricketSnapshot().state?.winner, undefined); assert.equal(store.getCricketSnapshot().state?.legsWon[0], 1);
  } finally { store.endCricket(); }
});
test('Cricket terč: vítězná šipka čeká na vytažení, oprava ji může zrušit', async () => {
  start(true);
  try {
    for (const darts of [[T(20), T(19), T(18)], [T(17), T(16), T(15)]]) {
      store.feedCricketFromBoard(frame(darts)); store.feedCricketFromBoard(frame([], 'Takeout finished')); await wait(1150);
    }
    store.feedCricketFromBoard(frame([D(25), S(25)])); await wait(650);
    assert.equal(store.getCricketSnapshot().state?.visitResult.checkout, true); assert.equal(store.getCricketSnapshot().state?.winner, undefined);
    store.feedCricketFromBoard(frame([S(25), S(25)], 'Dart corrected'));
    assert.equal(store.getCricketSnapshot().state?.visitResult.checkout, false);
    store.replaceCricketDart(0, D(25));
    store.feedCricketFromBoard(frame([S(25), S(25)]));
    assert.equal(store.getCricketSnapshot().state?.visitResult.checkout, true);
    store.feedCricketFromBoard(frame([S(25)], 'Takeout started')); assert.equal(store.getCricketSnapshot().state?.winner, undefined);
    store.feedCricketFromBoard(frame([], 'Takeout finished')); await wait(1150);
    assert.equal(store.getCricketSnapshot().state?.winner, 0); assert.equal(store.getCricketSnapshot().state?.history.length, 3);
    store.feedCricketFromBoard(frame()); assert.equal(store.getCricketSnapshot().state?.history.length, 3);
  } finally { store.endCricket(); }
});
test('Cricket terč: bez hlášení výsledků uchová rychlé další hody a chybný stav neukončí kolo', async () => {
  start(); setSoundEnabled(true);
  try {
    feedActiveGame(frame([T(20), S(20), S(19)])); feedActiveGame(frame([], 'Takeout finished'));
    feedActiveGame(frame([T(18)])); feedActiveGame(frame([T(18)]));
    await wait(1150);
    assert.equal(store.getCricketSnapshot().state?.current, 1); assert.equal(store.getCricketSnapshot().state?.history.length, 1); assert.equal(store.getCricketSnapshot().state?.marks[1][2], 3);
    assert.ok(!AudioStub.urls.some(url => url.includes('/score/')));
    store.feedCricketFromBoard({ type: 'state', data: { running: false, numThrows: 0 } });
    assert.equal(store.getCricketSnapshot().state?.history.length, 1); assert.match(store.getCricketSnapshot().boardNotice!, /není připravený/);
    store.endCricket(); await wait(20); assert.equal(store.hasCricket(), false);
  } finally { store.endCricket(); }
});
test('Sdílené ukončení a ochrana okna zahrnují Cricket i X01; hra Cricket se neobnovuje', () => {
  start(); assert.equal(hasAnyGame(), true); assert.equal(isAnyGameRunning(), true);
  endAnyGame(); assert.equal(hasAnyGame(), false); assert.equal(isAnyGameRunning(), false);
  startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players); assert.equal(hasGame(), true); assert.equal(isAnyGameRunning(), true);
  endAnyGame(); assert.equal(hasGame(), false); assert.equal(store.hasCricket(), false); caller.stop();
});

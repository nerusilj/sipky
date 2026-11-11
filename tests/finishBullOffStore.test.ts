import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import * as store from '../src/game/gameStore.ts';
import { bullDistanceDart } from '../src/game/bullOffRanking.ts';
import { BOT_PLAYERS } from '../src/game/bots.ts';
import { makeDart } from '../src/game/x01.ts';
import type { Dart } from '../src/game/x01.ts';
import { setSoundEnabled } from '../src/settings.ts';
import { caller } from '../src/caller/caller.ts';
const players = ['Radek', 'Olik', 'Franta'].map((name, index) => ({ id: String(index), name, color: '#ffffff' }));
const frame = (dart?: Dart) => ({ type: 'state', data: { connected: true, running: true, numThrows: dart ? 1 : 0, throws: dart ? [{ segment: dart, coords: dart.coords }] : [] } });
const snapshot21 = (darts: Dart[], event = 'throwDetected', status = 'throw') => ({ type: 'state', data: {
  connected: true, running: true, status, event,
  throws: darts.map(dart => ({ segmentName: dart.name, segmentNumber: dart.number, multiplier: dart.multiplier,
    coordsX: dart.coords?.x, coordsY: dart.coords?.y, bouncer: dart.bouncer })),
} });
const physical = (number: number, multiplier: number, mm: number): Dart => ({
  ...makeDart(number, multiplier), coords: { x: mm / 170, y: 0 },
});
async function advance(t: TestContext, cycles = 4) { for (let i = 0; i < cycles; i++) { t.mock.timers.tick(1000); await turn(); } }
function init() { setSoundEnabled(false); store.endGame(); store.feedGameFromBoard(frame()); }

test('oprava 25 a BULLu v rozhozu zachová fyzické vytažení a vstoupí do výpočtu pořadí', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const outer = physical(25, 1, 10), bull = physical(25, 2, 3);
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    store.finishLegByBullOff();
    store.feedGameFromBoard(snapshot21([outer]));
    assert.equal(store.correctBullOffThrow(0, 1, 'BULL'), true);
    store.feedGameFromBoard(snapshot21([outer])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 50);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    store.feedGameFromBoard(snapshot21([])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.correctBullOffThrow(0, 1, '25'), true, 'lze opravit i potvrzený hod tohoto kola');
    store.feedGameFromBoard(snapshot21([bull]));
    assert.equal(store.correctBullOffThrow(1, 1, 'MIMO'), true);
    await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 2);
    store.feedGameFromBoard(snapshot21([bull, physical(20, 1, 40)])); await advance(t);
    assert.deepEqual(store.getGameSnapshot().state?.lastBullOffResult?.places, [0, 2, 1]);
    assert.deepEqual(store.getGameSnapshot().state?.lastBullOffResult?.rounds[0].map(hit => hit.dart.score), [25, 0, 20]);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

test('potvrzená ruční oprava rozhozu změní vítěze zápasu a Zpět znovu otevře automatický výsledek', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players);
    store.finishLegByBullOff();
    for (const dart of [makeDart(25, 2), makeDart(25, 1), bullDistanceDart(35)]) {
      store.enterDart(dart); store.nextPlayer(); await advance(t);
    }
    assert.equal(store.getGameSnapshot().state?.winner, 0);
    store.continueAfterBullOff({ places: [1, 0, 2], corrections: [{ player: 1, choice: 'BULL' }, { player: 0, choice: '25' }] });
    assert.equal(store.getGameSnapshot().bullOffResultOpen, false);
    assert.equal(store.getGameSnapshot().state?.winner, 1);
    assert.deepEqual(store.getGameSnapshot().state?.legsWon, [0, 1, 0]);
    assert.deepEqual(store.getGameSnapshot().state?.lastBullOffResult?.rounds[0].map(hit => hit.dart.score), [25, 50, 0]);
    assert.equal(store.undoDart(), 'board');
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.equal(store.getGameSnapshot().state?.winner, 0);
    assert.deepEqual(store.getGameSnapshot().state?.legsWon, [1, 0, 0]);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

test('rozhoz z Autodarts 2.1: šipka mimo střed zůstane, BULL se vytáhne samostatně, následuje další hráč', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const first = physical(20, 1, 40), bull = physical(25, 2, 3), last = physical(6, 1, 25);
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    assert.equal(store.finishLegByBullOff(), true);
    store.feedGameFromBoard(snapshot21([first])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 1, 'tah se předá i se šipkou mimo střed v terči');
    store.feedGameFromBoard(snapshot21([first]));
    assert.equal(store.getGameSnapshot().state?.visit.length, 0);
    assert.equal(store.getGameSnapshot().boardPhase, 'ready');
    store.feedGameFromBoard(snapshot21([first, bull])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 50);
    store.nextPlayer();
    store.feedGameFromBoard(snapshot21([first], 'takeoutStarted', 'takeoutInProgress')); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 1, 'BULL musí hráč vytáhnout');
    store.feedGameFromBoard(snapshot21([first], 'takeoutFinished')); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 2);
    store.feedGameFromBoard(snapshot21([first, last])); await advance(t);
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [1, 2, 0]);
    store.continueAfterBullOff();
    assert.equal(store.getGameSnapshot().boardPhase, 'blocked');
    store.feedGameFromBoard(snapshot21([], 'takeoutFinished'));
    store.feedGameFromBoard(snapshot21([physical(20, 1, 80)]));
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 20);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

test('rozhoz započte jednu šipku, MIMO funguje vedle starých šipek a u 25 se čeká na její vytažení', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const first = physical(20, 1, 40), extra = physical(1, 1, 70), outer = physical(25, 1, 10);
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    store.finishLegByBullOff();
    store.feedGameFromBoard(snapshot21([first])); await advance(t, 1);
    assert.ok(store.getGameSnapshot().completing);
    store.feedGameFromBoard(snapshot21([first, extra])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.getGameSnapshot().state?.visit.length, 0);
    store.markBullOffMiss(); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 2);
    store.feedGameFromBoard(snapshot21([first, extra, outer])); await advance(t);
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 25);
    store.feedGameFromBoard(snapshot21([extra, outer], 'takeoutFinished')); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 2, 'vytažení jiné šipky nepotvrdí 25');
    store.feedGameFromBoard(snapshot21([extra], 'takeoutFinished')); await advance(t);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [2, 0, 1]);
    assert.deepEqual(store.getGameSnapshot().state?.lastBullOffResult?.rounds[0].map(hit => hit.dart.score), [20, 0, 25]);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

test('po třech ponechaných šipkách se terč vyprázdní a čtvrtý hráč nepřevezme žádný starý hod', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const retained = [physical(20, 1, 40), physical(6, 1, 32), physical(1, 1, 65)];
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, [...players, { id: '3', name: 'Pepa', color: '#fff' }]);
    store.finishLegByBullOff();
    for (let i = 1; i <= retained.length; i++) {
      store.feedGameFromBoard(snapshot21(retained.slice(0, i))); await advance(t);
      assert.equal(store.getGameSnapshot().state?.current, i);
    }
    assert.equal(store.getGameSnapshot().boardPhase, 'takeout');
    store.feedGameFromBoard(snapshot21(retained, 'takeoutStarted', 'takeoutInProgress'));
    store.feedGameFromBoard(snapshot21([], 'takeoutFinished'));
    assert.equal(store.getGameSnapshot().boardPhase, 'ready');
    assert.equal(store.getGameSnapshot().state?.current, 3);
    assert.equal(store.getGameSnapshot().state?.visit.length, 0);
    store.feedGameFromBoard(snapshot21([physical(3, 1, 23)], 'takeoutFinished')); await advance(t);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [3, 1, 0, 2]);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

test('nezachycené mimo předá tah bez vytažení a rozhoz vyhodnotí až po zbývajících hráčích', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    store.finishLegByBullOff();
    store.markBullOffMiss(); store.markBullOffMiss();
    await advance(t);
    const state = store.getGameSnapshot().state!;
    assert.equal(state.current, 1);
    assert.deepEqual(state.bullOff?.throws, [{ player: 0, dart: makeDart(0, 0) }]);
    store.feedGameFromBoard(frame(makeDart(25, 2)));
    store.markBullOffMiss();
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 50);
    store.feedGameFromBoard(frame()); await advance(t);
    store.feedGameFromBoard(frame(makeDart(25, 1))); store.feedGameFromBoard(frame()); await advance(t);
    assert.deepEqual(store.getGameSnapshot().state?.lastBullOffResult?.places, [1, 2, 0]);
  } finally { store.endGame(); caller.stop(); t.mock.timers.reset(); }
});

test('zrušení rozhozu při vyhodnocování nezapíše výsledek ani šipku z rozhozu do běžné hry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    store.finishLegByBullOff();
    store.markBullOffMiss();
    store.feedGameFromBoard(frame(makeDart(25, 2)));
    store.cancelGameBullOff();
    await advance(t);
    assert.equal(store.getGameSnapshot().state?.bullOff, undefined);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(store.getGameSnapshot().boardPhase, 'blocked');
    store.feedGameFromBoard(frame(makeDart(25, 2)));
    assert.equal(store.getGameSnapshot().state?.visit.length, 0);
    store.feedGameFromBoard(frame()); store.feedGameFromBoard(frame(makeDart(20, 1)));
    assert.equal(store.getGameSnapshot().state?.visitResult.remaining, 481);
    assert.deepEqual(store.getGameSnapshot().state?.legsWon, [0, 0, 0]);
  } finally { store.endGame(); caller.stop(); t.mock.timers.reset(); }
});

test('Zpět po spuštění rozhozu obnoví běžnou hru s příjmem hodů z terče', () => {
  init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    assert.equal(store.finishLegByBullOff(), true);
    assert.equal(store.undoDart(), 'board');
    assert.equal(store.getGameSnapshot().state?.bullOff, undefined);
    store.feedGameFromBoard(frame(makeDart(20, 1)));
    assert.equal(store.getGameSnapshot().state?.visitResult.remaining, 481);
  } finally { store.endGame(); caller.stop(); }
});

test('ruční rozhoz drží výsledky, odfiltruje fyzické hody a další leg začne až po pokračování', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players);
    assert.equal(store.finishLegByBullOff(), true);
    for (const dart of [bullDistanceDart(32), makeDart(25, 2), makeDart(25, 1)]) {
      store.enterDart(dart); await advance(t, 1);
      assert.ok(store.getGameSnapshot().state?.bullOff);
      store.nextPlayer(); await advance(t);
    }
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.equal(store.getGameSnapshot().state?.leg, 2);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [1, 2, 0]);
    const before = store.getGameSnapshot().game;
    store.feedGameFromBoard(frame(makeDart(20, 3))); store.enterDart(makeDart(20, 3)); store.nextPlayer(); await advance(t);
    assert.equal(store.getGameSnapshot().game, before);
    store.continueAfterBullOff(); assert.equal(store.getGameSnapshot().bullOffResultOpen, false);
    store.feedGameFromBoard(frame()); store.feedGameFromBoard(frame(makeDart(20, 1)));
    assert.equal(store.getGameSnapshot().state?.visit[0].score, 20);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});
test('Autodarts přijímá opravy do vytažení, shoda BULL se opakuje jen mezi remizujícími a Zpět vrátí rozhoz', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const physical = (mm: number) => ({ ...bullDistanceDart(mm), coords: { x: mm / 170, y: 0 } });
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players); store.finishLegByBullOff();
    for (const mm of [2, 5, 30]) {
      store.feedGameFromBoard(frame(physical(mm))); store.feedGameFromBoard(frame(physical(mm)));
      assert.equal(store.getGameSnapshot().state?.visit.length, 1);
      store.feedGameFromBoard(frame()); await advance(t);
    }
    assert.deepEqual(store.getGameSnapshot().state?.bullOff?.contenders, [0, 1]);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    store.feedGameFromBoard(frame(physical(60))); store.feedGameFromBoard(frame(physical(20)));
    assert.equal(store.getGameSnapshot().state?.visit[0].distance, 20 / 170);
    store.feedGameFromBoard(frame()); await advance(t);
    store.feedGameFromBoard(frame(physical(40))); store.feedGameFromBoard(frame()); await advance(t);
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [0, 1, 2]);
    store.undoDart(); assert.equal(store.getGameSnapshot().bullOffResultOpen, false);
    assert.equal(store.getGameSnapshot().state?.leg, 1); assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.ok(store.getGameSnapshot().state?.bullOff?.ranking);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});
test('bot v dalším legu počká na zavření výsledků rozhozu', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init(); const random = Math.random; Math.random = () => .9;
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, [BOT_PLAYERS[1], players[0]]);
    assert.equal(store.finishLegByBullOff(), true); await turn();
    for (let i = 0; i < 10 && store.getGameSnapshot().state?.current === 0; i++) await advance(t, 1);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    store.enterDart(makeDart(25, 2)); store.nextPlayer(); await advance(t);
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    await advance(t, 10); assert.equal(store.getGameSnapshot().state?.visit.length, 0);
    store.continueAfterBullOff(); await turn(); await advance(t, 1);
    assert.equal(store.getGameSnapshot().state?.visit.length, 1);
  } finally { Math.random = random; store.endGame(); t.mock.timers.reset(); caller.stop(); }
});


test('v rozhozu není ručně naměřená vzdálenost zaměněna za netrefu se zvukem MIMO', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  const cue = t.mock.method(caller, 'enqueueTurnSound', async () => {});
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players); store.finishLegByBullOff();
    store.enterDart(bullDistanceDart(35)); await advance(t, 1);
    assert.equal(cue.mock.callCount(), 0);
    assert.equal(store.getGameSnapshot().state?.visit[0].distance, 35 / 170);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});


test('zásah bez vzdálenosti nepředá tah; po Zpět přijme rozhoz opakovaný z terče', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); init();
  try {
    store.startGame({ startScore: 501, doubleOut: true, legsToWin: 3 }, players.slice(0, 2)); store.finishLegByBullOff();
    store.feedGameFromBoard(frame(makeDart(20, 1))); store.feedGameFromBoard(frame()); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(store.getGameSnapshot().state?.bullOff?.throws.length, 0);
    store.undoDart(); store.feedGameFromBoard(frame());
    const measured = { ...bullDistanceDart(32), coords: { x: 32 / 170, y: 0 } };
    store.feedGameFromBoard(frame(measured)); store.feedGameFromBoard(frame()); await advance(t);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.getGameSnapshot().state?.bullOff?.throws[0].dart.distance, 32 / 170);
    store.feedGameFromBoard(frame(makeDart(25, 2))); store.feedGameFromBoard(frame()); await advance(t);
    assert.equal(store.getGameSnapshot().bullOffResultOpen, true);
    assert.deepEqual(store.getGameSnapshot().state?.lastLegPlaces, [1, 0]);
  } finally { store.endGame(); t.mock.timers.reset(); caller.stop(); }
});

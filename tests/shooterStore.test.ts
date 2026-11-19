import test, { mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../src/game/shooterStore.ts';
import { endAnyGame, feedActiveGame, hasAnyGame, isAnyGameRunning } from '../src/game/activeGame.ts';
import { DEFAULT_SHOOTER_SETTINGS } from '../src/game/shooter.ts';
import type { ShooterSettings } from '../src/game/shooter.ts';
import { makeDart } from '../src/game/x01.ts';
import type { Dart } from '../src/game/x01.ts';
import { setSoundEnabled } from '../src/settings.ts';

const players = ['Radek', 'Petr'].map((name, i) => ({ id: String(i), name, color: '#fff' }));
const frame = (darts: Dart[] = [], event = 'throw', modern = true) => ({ type: 'state', data: { connected: true, running: true, event, numThrows: darts.length, throws: darts.map(d => modern ? { segmentNumber: d.number, multiplier: d.multiplier, segmentName: d.name } : { segment: { number: d.number, multiplier: d.multiplier, name: d.name } }) } });
const view = () => store.getShooterSnapshot();
const target = () => view().state!.target!;
function start(settings: ShooterSettings = DEFAULT_SHOOTER_SETTINGS) {
  endAnyGame(); setSoundEnabled(false); store.setShooterBoardConnected(true);
  store.feedShooterFromBoard(frame()); store.startShooter(settings, players, 765);
}
afterEach(() => { endAnyGame(); mock.timers.reset(); mock.restoreAll(); });

test('Shooter ručně: opravy, Zpět, předčasné potvrzení a společná ochrana rozehrané hry', () => {
  start(); assert.equal(hasAnyGame(), true); assert.equal(isAnyGameRunning(), true);
  const first = target(); store.enterShooterDart(makeDart(first, 3));
  assert.equal(view().state?.points[0], 1);
  store.replaceShooterDart(0, makeDart(0, 0));
  assert.equal(view().state?.points[0], 0);
  store.undoShooterDart(); assert.equal(target(), first);
  store.enterShooterDart(makeDart(first, 2)); store.nextShooterPlayer();
  assert.equal(view().state?.current, 1);
  assert.equal(view().state?.attempts[0], 3);
  store.undoShooterDart(); assert.equal(view().state?.current, 0);
  assert.equal(view().game?.current.length, 2);
  endAnyGame(); assert.equal(hasAnyGame(), false);
});
test('Shooter Autodarts 2.0 a 2.1: opakované snímky, oprava a částečné vytahování nezdvojí body', () => {
  for (const modern of [false, true]) {
    start();
    const darts = [makeDart(target(), 3)];
    feedActiveGame(frame(darts, 'throw', modern));
    feedActiveGame(frame(darts, 'throw', modern));
    assert.equal(view().state?.points[0], 1);
    darts.push(makeDart(target(), 2)); feedActiveGame(frame(darts, 'throw', modern));
    store.replaceShooterDart(0, makeDart(0, 0));
    feedActiveGame(frame(darts, 'throw', modern));
    assert.equal(view().state?.points[0], 1);
    darts.push(makeDart(target(), 1)); feedActiveGame(frame(darts, 'throw', modern));
    assert.equal(view().state?.current, 0);
    feedActiveGame(frame(darts.slice(0, 1), 'takeoutStarted', modern));
    assert.equal(view().game?.current.length, 3);
    feedActiveGame(frame([], 'takeoutFinished', modern));
    assert.equal(view().state?.current, 1); assert.equal(view().state?.history.length, 1);
    assert.equal(view().state?.points[0], 2);
    feedActiveGame(frame([], 'takeoutFinished', modern));
    assert.equal(view().state?.history.length, 1);
  }
});
test('Shooter: start se šipkami v terči čeká na prázdný terč a nepřebírá staré hody', () => {
  start(); store.endShooter(); store.feedShooterFromBoard(frame([makeDart(20, 1)]));
  store.startShooter(DEFAULT_SHOOTER_SETTINGS, players, 765);
  store.feedShooterFromBoard(frame([makeDart(target(), 1)]));
  assert.equal(view().game?.current.length, 0);
  store.feedShooterFromBoard(frame()); store.feedShooterFromBoard(frame([makeDart(target(), 1)]));
  assert.equal(view().state?.points[0], 1);
});
test('Shooter s časem: timeout bez fyzické šipky, pozdní hod a pokračování u druhého pokusu', () => {
  let now = 1000; mock.method(performance, 'now', () => now);
  start({ finish: 'rounds', rounds: 5, seconds: 10 });
  store.resumeShooterClock(); assert.equal(view().clock.phase, 'countdown');
  now = 4000; store.tickShooterClock(); assert.equal(view().clock.phase, 'running');
  now = 14000; store.tickShooterClock(); assert.equal(view().clock.phase, 'timeout');
  assert.equal(view().game?.current.length, 1); assert.equal(view().game?.current[0].timeout, true);
  store.feedShooterFromBoard(frame([makeDart(target(), 3)]));
  assert.equal(view().game?.current.length, 1); assert.equal(view().state?.points[0], 0);
  store.resumeShooterClock(); assert.equal(view().clock.phase, 'timeout');
  store.feedShooterFromBoard(frame()); store.resumeShooterClock();
  now = 17000; store.tickShooterClock();
  const dart = makeDart(target(), 2); store.feedShooterFromBoard(frame([dart]));
  assert.equal(view().game?.current.length, 2); assert.equal(view().state?.points[0], 1);
  assert.equal(view().state?.attempts[0], 2); assert.equal(view().state?.dartsThrown[0], 1);
  store.feedShooterFromBoard(frame([dart])); assert.equal(view().game?.current.length, 2);
  now = 27000; store.tickShooterClock();
  assert.equal(view().game?.current.length, 3);
  store.feedShooterFromBoard(frame()); store.resumeShooterClock();
  assert.equal(view().state?.current, 1); assert.equal(view().clock.phase, 'ready');
});
test('Shooter s časem: přijetí přesně na limitu je timeout, nikoli zásah nového cíle', () => {
  let now = 0; mock.method(performance, 'now', () => now);
  start({ finish: 'rounds', rounds: 5, seconds: 10 });
  store.resumeShooterClock(); now = 3000; store.tickShooterClock();
  const dart = makeDart(target(), 1);
  now = 13000; store.feedShooterFromBoard(frame([dart]));
  assert.equal(view().game?.current[0].timeout, true);
  assert.equal(view().state?.points[0], 0); assert.equal(view().game?.current.length, 1);
});
test('Shooter s časem: pauza, ztráta spojení, kalibrace a ruční zadání zastaví odpočet', () => {
  let now = 0; mock.method(performance, 'now', () => now);
  start({ finish: 'rounds', rounds: 5, seconds: 15 });
  store.resumeShooterClock(); now = 3000; store.tickShooterClock();
  store.pauseShooter(); now = 99999; store.tickShooterClock();
  assert.equal(view().game?.current.length, 0); assert.equal(view().clock.phase, 'paused');
  store.resumeShooterClock(); now += 3000; store.tickShooterClock();
  store.setShooterBoardConnected(false); now += 20000; store.tickShooterClock();
  assert.equal(view().clock.phase, 'offline'); assert.equal(view().game?.current.length, 0);
  store.setShooterBoardConnected(true); store.feedShooterFromBoard(frame());
  assert.equal(view().clock.phase, 'paused');
  store.resumeShooterClock(); now += 3000; store.tickShooterClock();
  store.feedShooterFromBoard({ type: 'state', data: { running: false, event: 'calibration', throws: [] } });
  now += 20000; store.tickShooterClock(); assert.equal(view().game?.current.length, 0);
  store.feedShooterFromBoard(frame());
  store.enterShooterDart(makeDart(target(), 1));
  assert.equal(view().clock.phase, 'manual'); assert.equal(view().state?.points[0], 1);
  now += 20000; store.tickShooterClock(); assert.equal(view().game?.current.length, 1);
});
test('Shooter s časem: předčasná šipka při odpočtu se nepřiřadí žádnému cíli', () => {
  let now = 0; mock.method(performance, 'now', () => now);
  start({ finish: 'rounds', rounds: 5, seconds: 10 }); store.resumeShooterClock();
  store.feedShooterFromBoard(frame([makeDart(target(), 1)]));
  assert.equal(view().game?.current.length, 0);
  store.feedShooterFromBoard(frame()); assert.equal(view().clock.phase, 'paused');
  store.resumeShooterClock(); now = 3000; store.tickShooterClock();
  store.feedShooterFromBoard(frame([makeDart(target(), 1)]));
  assert.equal(view().state?.points[0], 1);
});

test('Shooter s časem: ignorovaný hod při pauze po vytažení nesmaže dřívější zásahy', () => {
  let now = 0; mock.method(performance, 'now', () => now);
  start({ finish: 'rounds', rounds: 5, seconds: 10 }); store.resumeShooterClock();
  now = 3000; store.tickShooterClock();
  const first = makeDart(target(), 1); store.feedShooterFromBoard(frame([first]));
  store.pauseShooter(); store.feedShooterFromBoard(frame([first, makeDart(target(), 1)]));
  store.feedShooterFromBoard(frame()); store.resumeShooterClock();
  now = 6000; store.tickShooterClock();
  store.feedShooterFromBoard(frame([makeDart(target(), 3)]));
  assert.equal(view().state?.points[0], 2); assert.equal(view().game?.current.length, 2);
  assert.equal(view().game?.current[0].number, first.number);
});

test('Shooter bot: zamíří na aktuální cíl, po třech šipkách předá tah a konec zruší časovače', () => {
  start(); store.endShooter(); mock.timers.enable({ apis: ['setTimeout'] });
  store.startShooter(DEFAULT_SHOOTER_SETTINGS, [{ ...players[0], id: 'bot:hard', bot: 'hard' }, players[1]], 42);
  mock.timers.tick(901); assert.equal(view().game?.current.length, 1);
  mock.timers.tick(1001); assert.equal(view().game?.current.length, 2);
  mock.timers.tick(1001); assert.equal(view().game?.current.length, 3);
  mock.timers.tick(151); assert.equal(view().state?.current, 1);
  assert.equal(view().state?.history.length, 1);
  store.endShooter(); mock.timers.tick(10000); assert.equal(view().game, undefined);
});

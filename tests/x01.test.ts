import test from 'node:test';
import assert from 'node:assert/strict';
import { addDart, commitVisit, createGame, dartLabel, deriveState, ENDLESS, evaluateVisit, makeDart, setVisit, threeDartAverage, undo } from '../src/game/x01.ts';
import type { X01Game } from '../src/game/x01.ts';
import { suggestCheckout } from '../src/game/checkout.ts';
import { shuffle } from '../src/game/order.ts';
import { DEFAULT_SETUP, parseLastSetup } from '../src/game/lastSetup.ts';

test('sestava poslední hry: platné hodnoty se převezmou, neplatné nahradí výchozími', () => {
  assert.deepEqual(parseLastSetup('{"playerIds":["a","b","a",3],"randomOrder":false,"legsToWin":3,"doubleOut":false}'),
    { playerIds: ['a', 'b'], randomOrder: false, legsToWin: 3, doubleOut: false });
  assert.deepEqual(parseLastSetup('{"legsToWin":9,"randomOrder":"ano"}'), DEFAULT_SETUP);
  assert.deepEqual(parseLastSetup(null), DEFAULT_SETUP);
  assert.deepEqual(parseLastSetup('nejson'), DEFAULT_SETUP);
  assert.equal(DEFAULT_SETUP.randomOrder, true);
});

test('náhodné pořadí zachová všechny hráče a nemění původní seznam', () => {
  const list = ['a', 'b', 'c', 'd'];
  const sequence = [0.1, 0.9, 0.5];
  const mixed = shuffle(list, () => sequence.shift()!);
  assert.deepEqual([...mixed].sort(), list);
  assert.deepEqual(list, ['a', 'b', 'c', 'd']);
  assert.notDeepEqual(mixed, list);
  assert.deepEqual(shuffle([]), []);
});

const S = (n: number) => makeDart(n, 1), D = (n: number) => makeDart(n, 2), T = (n: number) => makeDart(n, 3);
const BULL = makeDart(25, 2), MISS = makeDart(0, 0);
const players = [{ id: 'a', name: 'Jarda', color: '#f00' }, { id: 'b', name: 'Petr', color: '#0f0' }];
const play = (game: X01Game, ...visits: ReturnType<typeof S>[][]) =>
  visits.reduce((g, darts) => commitVisit(darts.reduce(addDart, g)), game);

test('kolo: body, přehoz pod nulu, zbytek 1, nula bez doublu, zavření doublem i bullem', () => {
  assert.deepEqual(evaluateVisit(501, [T(20), T(20), T(20)], true), { scored: 180, bust: false, checkout: false, closed: true, remaining: 321 });
  assert.equal(evaluateVisit(40, [T(20)], true).bust, true);
  assert.equal(evaluateVisit(41, [D(20)], true).bust, true);
  assert.equal(evaluateVisit(40, [S(20), S(20)], true).bust, true);
  assert.equal(evaluateVisit(40, [S(20), S(20)], false).checkout, true);
  assert.equal(evaluateVisit(40, [D(20)], true).checkout, true);
  assert.equal(evaluateVisit(50, [BULL], true).checkout, true);
  assert.deepEqual(evaluateVisit(100, [S(20)], true), { scored: 20, bust: false, checkout: false, closed: false, remaining: 80 });
});

test('střídání hráčů, přehoz vrací skóre, po uzavřeném kole se další šipky ignorují', () => {
  let game = createGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players);
  game = play(game, [T(20), T(20), T(20)], [S(1), S(5), S(20)]);
  let s = deriveState(game);
  assert.deepEqual(s.remaining, [321, 475]);
  assert.equal(s.current, 0);
  game = addDart(game, T(20)); game = addDart(game, T(20)); game = addDart(game, T(20)); game = addDart(game, T(20));
  assert.equal(deriveState(game).visit.length, 3);
  game = commitVisit(game);
  s = deriveState(game);
  assert.deepEqual(s.remaining, [141, 475]);
  game = play(game, [MISS], [T(20), T(20), MISS], [T(20), T(20)]);
  s = deriveState(game);
  assert.equal(s.remaining[0], 21);
  game = play(game, [S(20), D(10)]);
  s = deriveState(game);
  assert.equal(s.remaining[0], 21);
  assert.equal(s.history.at(-1)?.bust, true);
  assert.equal(s.current, 1);
});

// 301: 180 (zbývá 121), soupeř mimo, pak T20 T19 D2 = zavření.
const LEG = [[T(20), T(20), T(20)], [MISS], [T(20), T(19), D(2)]];

test('zavření legu, střídání začínajícího hráče a konec zápasu', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 2 }, players);
  game = play(game, ...LEG);
  let s = deriveState(game);
  assert.deepEqual(s.legsWon, [1, 0]);
  assert.equal(s.leg, 2);
  assert.equal(s.legStarter, 1);
  assert.equal(s.current, 1);
  assert.deepEqual(s.remaining, [301, 301]);
  game = play(game, ...LEG);
  s = deriveState(game);
  assert.deepEqual(s.legsWon, [1, 1]);
  assert.equal(s.current, 0);
  assert.equal(s.winner, undefined);
  game = play(game, ...LEG);
  s = deriveState(game);
  assert.equal(s.winner, 0);
  assert.equal(s.lastLegWinner, 0);
});

test('hra dokola: legy se počítají, začínající se střídá, zápas nikdy neskončí', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: ENDLESS }, players);
  for (let leg = 0; leg < 6; leg++) game = play(game, ...LEG);
  const s = deriveState(game);
  assert.equal(s.winner, undefined);
  assert.deepEqual(s.legsWon, [3, 3]);
  assert.equal(s.leg, 7);
  assert.equal(s.current, 0);
  assert.equal(parseLastSetup('{"legsToWin":0}').legsToWin, ENDLESS);
});

test('vítěz zápasu, další vstup se ignoruje; průměr na 3 šipky', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players);
  game = play(game, [T(20), T(20), T(20)], [S(20), S(20), S(20)], [T(20), T(19), D(2)]);
  const s = deriveState(game);
  assert.equal(s.winner, 0);
  assert.equal(deriveState(play(game, [T(20)])).history.length, s.history.length);
  assert.equal(threeDartAverage(s, 0), 150.5);
  assert.equal(threeDartAverage(s, 1), 60);
});

test('krok zpět odebírá šipky i přes hranici kola a legu', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 2 }, players);
  game = play(game, ...LEG);
  assert.deepEqual(deriveState(game).legsWon, [1, 0]);
  game = undo(game);
  let s = deriveState(game);
  assert.deepEqual(s.legsWon, [0, 0]);
  assert.equal(s.current, 0);
  assert.deepEqual(s.visit.map(dartLabel), ['T20', 'T19']);
  game = undo(undo(game));
  s = deriveState(game);
  assert.equal(s.current, 0);
  assert.equal(s.visit.length, 0);
  s = deriveState(undo(game));
  assert.equal(s.current, 1);
  assert.equal(s.visit.length, 0);
});

test('kolo z terče nahradí rozehrané šipky (opravená šipka)', () => {
  let game = createGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players);
  game = addDart(addDart(game, T(20)), T(20));
  game = commitVisit(setVisit(game, [T(20), S(20), S(1)]));
  assert.equal(deriveState(game).remaining[0], 501 - 81);
});

test('doporučený checkout', () => {
  const names = (r: number, d = 3) => suggestCheckout(r, d)?.map(dartLabel).join(' ');
  assert.equal(names(170), 'T20 T20 Bull');
  assert.equal(names(40), 'D20');
  assert.equal(names(32), 'D16');
  assert.equal(names(50), 'Bull');
  assert.equal(names(60), 'S20 D20');
  assert.equal(names(61), '25 D18');
  assert.equal(names(100), 'T20 D20');
  assert.equal(names(141), 'T20 T19 D12');
  assert.equal(names(121, 3)?.split(' ').length, 3);
  for (const bogey of [169, 168, 166, 165, 163, 162, 159]) assert.equal(suggestCheckout(bogey, 3), undefined, String(bogey));
  assert.equal(suggestCheckout(100, 1), undefined);
  assert.equal(suggestCheckout(1, 3), undefined);
  assert.equal(suggestCheckout(171, 3), undefined);
  assert.equal(names(3), 'S1 D1');
});

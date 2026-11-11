import test from 'node:test';
import assert from 'node:assert/strict';
import { addDart, commitVisit, createGame, deriveState, legDartNumber, legThreeDartAverage, makeDart, playerTotals, threeDartAverage, undo } from '../src/game/x01.ts';
import type { Dart, X01Game } from '../src/game/x01.ts';

const players = [{ id: 'a', name: 'Jarda', color: '#f00' }, { id: 'b', name: 'Petr', color: '#0f0' }];
const S = (n: number) => makeDart(n, 1), D = (n: number) => makeDart(n, 2), T = (n: number) => makeDart(n, 3);
const play = (game: X01Game, ...visits: Dart[][]) => visits.reduce((g, darts) => commitVisit(darts.reduce(addDart, g)), game);

 test('živý průměr: body, přehoz, oprava zpět a zavření nezapočítají šipky dvakrát', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players);
  game = addDart(game, T(20));
  assert.equal(threeDartAverage(deriveState(game), 0), 180);
  game = addDart(game, S(20));
  assert.equal(threeDartAverage(deriveState(game), 0), 120);
  game = play({ ...game, current: [] }, [T(20), T(20), T(20)], [S(20), S(20), S(20)]);
  game = addDart(game, T(20));
  assert.deepEqual(playerTotals(deriveState(game), 0), { darts: 4, points: 240 });
  game = addDart(game, T(20));
  assert.deepEqual(playerTotals(deriveState(game), 0), { darts: 6, points: 180 });
  assert.equal(threeDartAverage(deriveState(game), 0), 90);
  game = undo(game);
  assert.equal(threeDartAverage(deriveState(game), 0), 180);
  game = addDart(addDart(game, T(19)), D(2));
  const live = playerTotals(deriveState(game), 0);
  assert.deepEqual(live, { darts: 6, points: 301 });
  assert.deepEqual(playerTotals(deriveState(commitVisit(game)), 0), live);
  assert.equal(threeDartAverage(deriveState(commitVisit(game)), 0), 150.5);
});

 test('průměr legu se resetuje v dalším legu, průměr zápasu pokračuje a krok zpět oba obnoví', () => {
  const leg = [[T(20), T(20), T(20)], [S(20), S(20), S(20)], [T(20), T(19), D(2)]];
  let game = play(createGame({ startScore: 301, doubleOut: true, legsToWin: 2 }, players), ...leg);
  let state = deriveState(game);
  assert.deepEqual(state.legsWon, [1, 0]);
  assert.equal(legThreeDartAverage(state, 0), 0);
  assert.equal(threeDartAverage(state, 0), 150.5);
  game = addDart(game, S(10)); // druhý leg začíná Petr
  state = deriveState(game);
  assert.equal(legThreeDartAverage(state, 1), 30);
  assert.equal(threeDartAverage(state, 1), 52.5);
  game = undo(undo(game));
  state = deriveState(game);
  assert.deepEqual(state.legsWon, [0, 0]);
  assert.equal(state.leg, 1);
  assert.equal(legThreeDartAverage(state, 0), threeDartAverage(state, 0));
});

test('počet hozených šipek začíná nulou, navazuje v legu a vrací se při opravě', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 2 }, players);
  assert.equal(legDartNumber(deriveState(game), 0), 0);
  assert.equal(legDartNumber(deriveState(game), 1), 0);
  game = addDart(game, T(20));
  assert.equal(legDartNumber(deriveState(game), 0), 1);
  game = addDart(game, T(20));
  assert.equal(legDartNumber(deriveState(game), 0), 2);
  game = addDart(game, T(20));
  assert.equal(legDartNumber(deriveState(game), 0), 3);
  game = commitVisit(game);
  assert.equal(legDartNumber(deriveState(game), 0), 3);
  assert.equal(legDartNumber(deriveState(game), 1), 0);
  game = play(game, [S(20), S(20), S(20)]);
  assert.equal(legDartNumber(deriveState(game), 0), 3);
  game = addDart(addDart(game, T(20)), T(19));
  assert.equal(legDartNumber(deriveState(game), 0), 5);
  game = undo(game);
  assert.equal(legDartNumber(deriveState(game), 0), 4);
  game = commitVisit(addDart(addDart(game, T(19)), D(2)));
  assert.equal(deriveState(game).leg, 2);
  assert.equal(legDartNumber(deriveState(game), 0), 0);
  assert.equal(legDartNumber(deriveState(game), 1), 0);
  game = undo(game);
  assert.equal(deriveState(game).leg, 1);
  assert.equal(legDartNumber(deriveState(game), 0), 5);
  const won = commitVisit(addDart({ ...game, settings: { ...game.settings, legsToWin: 1 } }, D(2)));
  assert.equal(deriveState(won).winner, 0);
  assert.equal(legDartNumber(deriveState(won), 0), 6);
});

test('zrušení prvního hodu vrátí nulu a hod mimo se počítá jako odhozená šipka', () => {
  const game = createGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players);
  const thrown = addDart(game, makeDart(0, 0));
  assert.equal(legDartNumber(deriveState(thrown), 0), 1);
  assert.equal(legDartNumber(deriveState(undo(thrown)), 0), 0);
  const skipped = commitVisit(game);
  assert.equal(legDartNumber(deriveState(skipped), 0), 0);
  assert.equal(legDartNumber(deriveState(skipped), 1), 0);
});

 test('rozhoz na střed nemění průměr zápasu ani legu', () => {
  let game = createGame({ startScore: 301, doubleOut: true, legsToWin: 2, maxRounds: 1 }, players);
  game = play(game, [S(20), S(20), S(20)], [S(10), S(10), S(10)]);
  assert.ok(deriveState(game).bullOff);
  game = addDart(game, makeDart(25, 2));
  assert.deepEqual(playerTotals(deriveState(game), 0), { darts: 3, points: 60 });
  assert.equal(legThreeDartAverage(deriveState(game), 0), 60);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addCricketDart, commitCricketVisit, createCricket, cricketTotals, deriveCricket, setCricketVisit, undoCricket } from '../src/game/cricket.ts';
import { makeDart } from '../src/game/x01.ts';
import type { CricketGame } from '../src/game/cricket.ts';
import type { Dart } from '../src/game/x01.ts';
import { BoardGameInput } from '../src/game/boardInput.ts';
const players = ['Radek', 'Petr', 'Olik'].map((name, i) => ({ id: String(i), name, color: '#ffffff' }));
const S = (n: number) => makeDart(n, 1), D = (n: number) => makeDart(n, 2), T = (n: number) => makeDart(n, 3);
const create = (count = 2, legs = 1) => createCricket({ legsToWin: legs }, players.slice(0, count));
const play = (game: CricketGame, darts: Dart[]) => commitCricketVisit(setCricketVisit(game, darts));
const ready = (legs = 1, count = 2) => ({ ...create(count, legs), visits: [[T(20), T(19), T(18)], ...Array.from({ length: count - 1 }, () => [] as Dart[]), [T(17), T(16), T(15)], ...Array.from({ length: count - 1 }, () => [] as Dart[])] });

test('Cricket: jen 15–20 a BULL, jeden/dva/tři zásahy, body při překročení zavření na stejné šipce', () => {
  let game = setCricketVisit(create(), [S(20), T(20), D(19)]);
  let state = deriveCricket(game);
  assert.deepEqual(state.marks[0], [3, 2, 0, 0, 0, 0, 0]); assert.equal(state.points[0], 20); assert.equal(state.visitResult.marks, 6);
  game = setCricketVisit(create(), [T(14), S(25), D(25)]); state = deriveCricket(game);
  assert.deepEqual(state.marks[0], [0, 0, 0, 0, 0, 0, 3]); assert.equal(state.points[0], 0); assert.equal(state.visitResult.marks, 3);
  assert.equal(addCricketDart(game, T(20)), game);
  state = deriveCricket(setCricketVisit(create(), [{ ...T(20), bouncer: true }, makeDart(0, 0), T(1)]));
  assert.equal(state.visitResult.marks, 0); assert.ok(state.marks[0].every(n => n === 0));
});
test('Cricket: ve více hráčích se body přičtou jednou a všemi zavřené číslo už neboduje', () => {
  let game = setCricketVisit(create(3), [T(20), T(20)]);
  assert.equal(deriveCricket(game).points[0], 60);
  game = play(game, [T(20), T(20)]); game = play(game, [T(20)]); game = play(game, [T(20)]);
  const state = deriveCricket(setCricketVisit(game, [T(20)]));
  assert.equal(state.points[0], 60); assert.equal(state.visitResult.marks, 0); assert.equal(state.visitResult.scored, 0);
});
test('Cricket: zavření všech čísel a shodný počet bodů vítězí, leg se připíše až potvrzením', () => {
  let game = setCricketVisit(ready(), [D(25), S(25), T(20)]);
  let state = deriveCricket(game);
  assert.equal(state.visitResult.checkout, true); assert.equal(state.visit.length, 2); assert.equal(state.winner, undefined); assert.deepEqual(state.legsWon, [0, 0]);
  game = commitCricketVisit(game); state = deriveCricket(game);
  assert.equal(state.winner, 0); assert.deepEqual(state.legsWon, [1, 0]); assert.equal(state.history.at(-1)?.darts.length, 2);
  assert.equal(addCricketDart(game, T(20)), game); assert.equal(commitCricketVisit(game), game);
});
test('Cricket: hráč se zavřenými čísly a nižším skóre musí dál bodovat', () => {
  let game = create();
  for (const darts of [[], [T(20), T(20)], [T(20), T(19), T(18)], [], [T(17), T(16), T(15)], []]) game = play(game, darts);
  game = play(game, [D(25), S(25)]);
  assert.equal(deriveCricket(game).winner, undefined); assert.deepEqual(deriveCricket(game).points, [0, 60]);
  game = play(game, []); game = play(game, [T(19)]);
  assert.equal(deriveCricket(game).winner, undefined); assert.equal(deriveCricket(game).points[0], 57);
  game = play(game, []); game = play(game, [S(19)]);
  assert.equal(deriveCricket(game).winner, 0); assert.equal(deriveCricket(game).points[0], 76);
});
test('Cricket: oprava po zdánlivém zavření vrátí vyhodnocení dalších šipek a Zpět obnoví leg', () => {
  let game = setCricketVisit(ready(), [D(25), S(25), T(20)]);
  game = setCricketVisit(game, [S(25), makeDart(0, 0), T(20)]);
  assert.equal(deriveCricket(game).visitResult.checkout, false); assert.equal(deriveCricket(game).points[0], 60);
  game = play(ready(2), [D(25), S(25)]);
  assert.equal(deriveCricket(game).leg, 2); assert.equal(deriveCricket(game).current, 1); assert.ok(deriveCricket(game).marks.every(m => m.every(n => n === 0)));
  assert.deepEqual(deriveCricket(game).points, [0, 0]);
  const back = deriveCricket(undoCricket(game)); assert.equal(back.leg, 1); assert.equal(back.current, 0); assert.deepEqual(back.legsWon, [0, 0]); assert.equal(back.marks[0][6], 2);
  assert.equal(deriveCricket(undoCricket(play(ready(), [D(25), S(25)]))).winner, undefined);
});
test('Cricket: užitečné zásahy, MPR, zkrácené a vítězné kolo, sólo a hra dokola', () => {
  const game = play(ready(0, 1), [D(25), D(25)]), state = deriveCricket(game);
  assert.equal(state.leg, 2); assert.equal(state.winner, undefined); assert.equal(state.legsWon[0], 1);
  assert.deepEqual(cricketTotals(state, 0), { marks: 21, points: 0, darts: 8, mpr: 21 / 8 * 3 });
  assert.equal(cricketTotals(state, 0, 2).darts, 0);
  assert.equal(cricketTotals(deriveCricket(play(create(), [T(20)])), 0).darts, 3);
  assert.equal(cricketTotals(deriveCricket(setCricketVisit(create(), [T(20)])), 0).mpr, 9);
  assert.throws(() => createCricket({ legsToWin: -1 }, players)); assert.throws(() => createCricket({ legsToWin: 1 }, [])); assert.throws(() => createCricket({ legsToWin: 1 }, [players[0], players[0]]));
});
const frame = (darts: Dart[], event = 'Throw detected') => ({ type: 'state', data: { connected: true, running: true, event, numThrows: darts.length, throws: darts.map(({ name, number, multiplier }) => ({ segment: { name, number, multiplier } })) } });
test('Cricket + Autodarts: čeká na prázdný terč, přijímá opravy, vytažení potvrdí jen jednou', () => {
  const input = new BoardGameInput<CricketGame>({ commit: commitCricketVisit, setVisit: setCricketVisit, status: deriveCricket });
  let game = input.handle(frame([D(25), S(25)]), ready()).game!;
  assert.equal(deriveCricket(game).visitResult.checkout, true); assert.equal(deriveCricket(game).winner, undefined);
  game = input.handle(frame([S(25), S(25)], 'Dart corrected'), game).game!;
  assert.equal(deriveCricket(game).visitResult.checkout, false);
  input.overrideDart(0, D(25));
  game = input.handle(frame([S(25), S(25)]), game).game!;
  assert.equal(deriveCricket(game).visitResult.checkout, true);
  game = input.handle(frame([S(25)], 'Takeout started'), game).game!;
  assert.equal(game.visits.length, 4);
  game = input.handle(frame([], 'Takeout finished'), game).game!;
  assert.equal(deriveCricket(game).winner, 0); assert.equal(game.visits.length, 5);
  assert.equal(input.handle(frame([], 'Manual reset'), game).committed, false);
});
test('Cricket + Autodarts: při startu nepřevezme staré šipky a ruční režim ignoruje snapshoty', () => {
  const input = new BoardGameInput<CricketGame>({ commit: commitCricketVisit, setVisit: setCricketVisit, status: deriveCricket });
  input.handle(frame([T(20)])); input.begin(); let game = create();
  assert.deepEqual(input.handle(frame([T(20)]), game).game?.current, []);
  input.handle(frame([]), game); game = input.handle(frame([T(19)]), game).game!;
  assert.equal(deriveCricket(game).marks[0][1], 3);
  input.editManually(); game = setCricketVisit(game, [S(15)]);
  assert.equal(input.handle(frame([T(20)]), game).game, game);
});

const recorded = readFileSync(new URL('./fixtures/board-session-2026-10-11.jsonl', import.meta.url), 'utf8').trim().split('\n').map(line => JSON.parse(line));
for (const [name, frames, visits] of [['první soubor', recorded.slice(0, 244), 41], ['celý záznam', recorded, 195]] as const) {
  test(`Cricket replay skutečného terče: ${name}, právě ${visits} kol bez dvojího přepnutí`, () => {
    const input = new BoardGameInput<CricketGame>({ commit: commitCricketVisit, setVisit: setCricketVisit, status: deriveCricket });
    let game = create(2, 0), commits = 0;
    for (const frame of frames) {
      const before = deriveCricket(game), result = input.handle(frame, game);
      game = result.game!; const after = deriveCricket(game);
      if (result.committed) {
        commits++; const record = after.history.at(-1)!;
        assert.equal(record.player, before.current); assert.equal(record.round, before.round); assert.equal(record.leg, before.leg);
      } else { assert.equal(after.current, before.current); assert.equal(after.history.length, before.history.length); }
    }
    assert.equal(commits, visits); assert.equal(game.visits.length, visits); assert.equal(game.current.length, 0);
  });
}
test('Cricket: maximálně osm různých hráčů, kolo se posune až po posledním hráči', () => {
  const eight = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Hráč ${i + 1}`, color: '#ffffff' }));
  let game = createCricket({ legsToWin: 1 }, eight);
  for (let i = 0; i < 8; i++) { assert.equal(deriveCricket(game).current, i); assert.equal(deriveCricket(game).round, 1); game = play(game, [S(20)]); }
  assert.equal(deriveCricket(game).current, 0); assert.equal(deriveCricket(game).round, 2);
  assert.throws(() => createCricket({ legsToWin: 1 }, [...eight, { ...eight[0], id: 'ninth' }]));
});

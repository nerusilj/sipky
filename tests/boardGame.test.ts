import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BoardGameInput } from '../src/game/boardInput.ts';
import { parseDart } from '../src/caller/visitTracker.ts';
import { addDart, commitVisit, compareBullThrows, correctVisit, createGame, deriveState, makeDart } from '../src/game/x01.ts';
import type { Dart, X01Game } from '../src/game/x01.ts';
import { parseSavedGame } from '../src/game/gamePersistence.ts';

const players = [{ id: 'a', name: 'Jarda', color: '#ff7a1f' }, { id: 'b', name: 'Petr', color: '#40e0c8' }];
const S = (n: number) => makeDart(n, 1), D = (n: number) => makeDart(n, 2), T = (n: number) => makeDart(n, 3);
const game = () => createGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players);
const state = (darts: Dart[], event = 'Throw detected', status = 'Throw') => ({ type: 'state', data: {
  connected: true, running: true, event, status, numThrows: darts.length,
  ...(darts.length ? { throws: darts.map(({ name, number, multiplier }) => ({ segment: { name, number, multiplier } })) } : {}),
} });
const clear = () => state([], 'Takeout finished');
const takeout = (darts: Dart[]) => state(darts, 'Takeout started', 'Takeout in progress');
const feed = (input: BoardGameInput, g: X01Game, payload: unknown) => input.handle(payload, g).game!;
const play = (g: X01Game, darts: Dart[]) => commitVisit(darts.reduce(addDart, g));

test('třetí šipka i vytažení zachovají hráče; přepne se až na prázdném terči, jen jednou', () => {
  const input = new BoardGameInput(); let g = game();
  const darts = [T(20), S(20), S(5)];
  g = feed(input, g, state(darts));
  assert.equal(deriveState(g).visitResult.remaining, 216);
  assert.equal(deriveState(g).current, 0);
  assert.equal(g.visits.length, 0);
  g = feed(input, g, takeout(darts));
  assert.equal(g.visits.length, 0);
  g = feed(input, g, clear());
  assert.equal(deriveState(g).current, 1);
  assert.equal(g.visits.length, 1);
  g = feed(input, g, state([], 'Manual reset'));
  assert.equal(g.visits.length, 1);
  g = feed(input, g, takeout([]));
  g = feed(input, g, clear());
  assert.equal(g.visits.length, 1);
});

test('oprava třetí šipky se přepočítá před potvrzením, i po zdánlivém zavření / přehozu', () => {
  const input = new BoardGameInput();
  let g = { ...game(), visits: [[T(20), T(20), T(20)], [S(1)], [T(20), S(20), S(1)], [S(1)]] };
  assert.equal(deriveState(g).remaining[0], 40);
  g = feed(input, g, state([D(20)]));
  assert.equal(deriveState(g).visitResult.checkout, true);
  assert.equal(deriveState(g).winner, undefined);
  g = feed(input, g, state([T(20)], 'Dart corrected'));
  assert.equal(deriveState(g).visitResult.bust, true);
  g = feed(input, g, state([S(20)], 'Dart corrected'));
  assert.equal(deriveState(g).visitResult.bust, false);
  g = feed(input, g, state([S(20), S(5), S(5)]));
  g = feed(input, g, state([S(20), S(5), D(5)], 'Dart corrected'));
  assert.equal(deriveState(g).visitResult.remaining, 5);
  g = feed(input, g, clear());
  assert.equal(deriveState(g).remaining[0], 5);
  assert.equal(deriveState(g).history.at(-1)!.scored, 35);
});

test('jedna / dvě šipky a Manual reset dokončí kolo; průběžné ubývání při vytažení skóre nesmaže', () => {
  const input = new BoardGameInput(); let g = game();
  g = feed(input, g, state([T(20), D(5)]));
  g = feed(input, g, takeout([T(20), D(5)]));
  g = feed(input, g, takeout([T(20)]));
  g = feed(input, g, state([], 'Manual reset'));
  assert.equal(deriveState(g).history[0].scored, 70);
  g = feed(input, g, state([S(7)]));
  g = feed(input, g, state([], 'Manual reset'));
  assert.equal(deriveState(g).history[1].scored, 7);
});

test('start / ruční další hráč nepřevzme staré šipky; po vytažení přijme nový hod', () => {
  const input = new BoardGameInput();
  input.handle(state([S(20), S(20), S(20)]));
  input.begin(); let g = game();
  g = feed(input, g, takeout([S(20), S(20), S(20)]));
  assert.equal(input.phase, 'blocked');
  g = feed(input, g, clear()); assert.equal(g.visits.length, 0);
  g = feed(input, g, state([S(5)]));
  assert.equal(g.current[0].score, 5);
  g = commitVisit(g); input.begin();
  g = feed(input, g, state([S(5), S(20)]));
  g = feed(input, g, clear());
  assert.equal(g.visits.length, 1);
  g = feed(input, g, state([S(7)])); assert.equal(g.current[0].score, 7);
});

test('ruční oprava se nepřepíše terčem a potvrzuje se ručně', () => {
  const input = new BoardGameInput(); let g = feed(input, game(), state([T(20)]));
  input.editManually(); g = correctVisit(g, [S(20)], false);
  g = feed(input, g, state([T(20), S(5), S(5)]));
  g = feed(input, g, clear());
  assert.deepEqual(g.current.map(dart => dart.score), [20]);
  assert.equal(g.visits.length, 0);
  g = commitVisit(g); input.begin();
  assert.equal(deriveState(g).history[0].scored, 20);
  assert.equal(input.phase, 'ready');
});

test('ruční oprava zůstane po obnově hry a potvrzuje se vytažením právě jednou', () => {
  const input = new BoardGameInput();
  let g = feed(input, game(), state([T(20), S(5), S(7)]));
  input.overrideDart(0, S(20));
  g = correctVisit(g, [S(20), S(5), S(7)], false);
  const saved = parseSavedGame(JSON.stringify({ version: 1, game: g, boardPhase: input.phase, corrections: input.corrections }))!;
  assert.ok(saved);
  const restored = new BoardGameInput();
  restored.restore(saved.game.current, saved.boardPhase, saved.corrections);
  g = feed(restored, saved.game, state([T(20), S(5), S(7)]));
  assert.deepEqual(g.current.map(d => d.score), [20, 5, 7]);
  g = feed(restored, g, takeout([T(20)]));
  assert.equal(g.current.length, 3);
  g = feed(restored, g, clear());
  g = feed(restored, g, clear());
  assert.equal(g.visits.length, 1);
  assert.equal(deriveState(g).history[0].scored, 32);
  g = feed(restored, g, state([T(20)]));
  assert.equal(g.current[0].score, 60);
});

test('oprava první šipky po přehozu obnoví vyhodnocení zbývajících šipek', () => {
  const input = new BoardGameInput();
  let g = game();
  for (const darts of [[T(20), T(20), T(20)], [S(1)], [T(20), S(20), S(1)], [S(1)]]) g = play(g, darts);
  assert.equal(deriveState(g).remaining[0], 40);
  g = feed(input, g, state([T(20)]));
  assert.equal(deriveState(g).visitResult.bust, true);
  for (const darts of [[T(20), S(5)], [T(20), S(5), S(5)]]) {
    g = feed(input, g, state(darts));
    // Horní přehled, dlaždice i skóre používají vyhodnocené šipky do přehozu.
    assert.deepEqual(deriveState(g).visit.map(d => d.name), ['T20']);
    assert.equal(deriveState(g).visitResult.scored, 0);
    assert.equal(deriveState(g).visitResult.bust, true);
  }
  input.overrideDart(0, S(20));
  g = correctVisit(g, [S(20), S(5), S(5)], false);
  g = feed(input, g, state([T(20), S(5), S(5)]));
  assert.equal(deriveState(g).visitResult.bust, false);
  assert.equal(deriveState(g).visitResult.remaining, 10);
  assert.equal(deriveState(g).visit.length, 3);
});

test('rozhoz bere jen jednu šipku hráče, opravy přijímá a také čeká na vytažení', () => {
  const input = new BoardGameInput();
  let g = createGame({ startScore: 301, doubleOut: true, legsToWin: 1, maxRounds: 1 }, players);
  g = play(play(g, [S(1)]), [S(1)]);
  assert.ok(deriveState(g).bullOff);
  const count = g.visits.length;
  g = feed(input, g, state([S(25)]));
  g = feed(input, g, state([D(25)], 'Dart corrected'));
  g = feed(input, g, state([D(25), S(20), S(20)]));
  assert.equal(deriveState(g).current, 0);
  assert.equal(g.visits.length, count);
  g = feed(input, g, clear());
  assert.equal(deriveState(g).current, 1);
  g = feed(input, g, state([S(25)]));
  g = feed(input, g, clear());
  assert.equal(deriveState(g).winner, 0);
});

test('neplatné snapshoty, kalibrace a zastavený terč neuzavřou rozehrané kolo', () => {
  const input = new BoardGameInput(); let g = feed(input, game(), state([S(20)]));
  for (const payload of [null, { type: 'motion_state', data: { numThrows: 0 } },
    { type: 'state', data: { numThrows: 0, event: 'Calibration started', status: 'Calibrating' } },
    { type: 'state', data: { numThrows: 0, connected: false } },
    { type: 'state', data: { numThrows: 0, running: false } },
    { type: 'state', data: { throws: [], numThrows: 2 } }, state([S(20), S(1), S(1), S(1)])]) {
    assert.equal(feed(input, g, payload), g);
  }
  g = feed(input, g, clear()); assert.equal(g.visits.length, 1);
});

test('odražená šipka je nula a v rozhozu nevyhraje díky souřadnicím 0,0', () => {
  const bounced = parseDart({ bouncer: true, coords: { x: 0, y: 0 }, segment: { name: 'Bull', number: 25, multiplier: 2 } })!;
  assert.equal(bounced.score, 0);
  assert.equal(bounced.distance, undefined);
  assert.ok(compareBullThrows(bounced, { ...S(1), distance: 0.8 }) > 0);
  assert.ok(compareBullThrows({ ...makeDart(25, 0), distance: 1.2 }, { ...S(1), distance: 0.8 }) > 0);
});

test('oprava posledního vítězného kola vrátí hru do původního legu, Zpět zůstává možné', () => {
  let g = { ...game(), visits: [[T(20), T(20), T(20)], [S(1)], [T(20), S(20), S(1)], [S(1)], [D(20)]] };
  assert.equal(deriveState(g).winner, 0);
  g = correctVisit(g, [S(20)], true);
  assert.equal(deriveState(g).winner, undefined);
  assert.equal(deriveState(g).remaining[0], 20);
  assert.equal(deriveState(g).current, 1);
});

test('historie ponechá skutečná kola i po vynechání hráče, který už zavřel', () => {
  let g = createGame({ startScore: 301, doubleOut: false, legsToWin: 1, minFinishers: 2 }, [...players, { id: 'c', name: 'Karel', color: '#fff' }]);
  for (const darts of [[T(20), T(20), T(20)], [S(1)], [S(1)], [T(20), T(20), S(1)], [S(1)], [S(1)], [S(1)], [S(1)]]) g = play(g, darts);
  assert.deepEqual(deriveState(g).history.map(v => [v.round, v.player]), [[1,0], [1,1], [1,2], [2,0], [2,1], [2,2], [3,1], [3,2]]);
});

test('obnovení ručního a zablokovaného vstupu nepřevezme staré šipky', () => {
  let g = { ...game(), current: [S(20)] };
  const manual = new BoardGameInput(); manual.restore(g.current, 'manual');
  g = feed(manual, g, state([T(20)])); g = feed(manual, g, clear());
  assert.equal(g.current[0].score, 20);
  assert.equal(g.visits.length, 0);
  const blocked = new BoardGameInput(); blocked.restore([], 'blocked');
  let fresh = feed(blocked, game(), state([T(20), T(20), T(20)]));
  fresh = feed(blocked, fresh, clear());
  assert.equal(fresh.visits.length, 0);
});

test('obnovení rozehrané hry zachová kolo a nepřičte znovu stejný snapshot', () => {
  const input = new BoardGameInput(); let g = feed(input, game(), state([T(20), S(20), S(5)]));
  const saved = parseSavedGame(JSON.stringify({ version: 1, game: g, boardPhase: input.phase }))!;
  assert.ok(saved);
  const restored = new BoardGameInput(); restored.restore(saved.game.current, saved.boardPhase);
  g = feed(restored, saved.game, state([T(20), S(20), S(5)]));
  assert.equal(g.current.length, 3);
  g = feed(restored, g, clear()); assert.equal(g.visits.length, 1);
  assert.equal(deriveState(g).history[0].scored, 85);
  for (const mutate of [
    (v: any) => { v.game.settings.startScore = 1; },
    (v: any) => { v.game.players[1].id = v.game.players[0].id; },
    (v: any) => { v.game.current[0].score = 999; },
    (v: any) => { v.game.visits.push({ decide: 8 }); },
    (v: any) => { v.boardPhase = 'neznámá'; },
  ]) { const value = JSON.parse(JSON.stringify(saved)); mutate(value); assert.equal(parseSavedGame(JSON.stringify(value)), undefined); }
  assert.equal(parseSavedGame('{'), undefined);
});

const recorded = readFileSync(new URL('./fixtures/board-session-2026-10-11.jsonl', import.meta.url), 'utf8').trim().split('\n').map(line => JSON.parse(line));
for (const [name, rows, visits] of [['první soubor', recorded.slice(0, 244), 41], ['celý druhý soubor', recorded, 195]] as const) {
  test(`replay skutečného terče: ${name}, správné skóre a právě ${visits} potvrzených kol`, () => {
    const input = new BoardGameInput();
    let g = createGame({ startScore: 501, doubleOut: true, legsToWin: 0 }, players);
    let commits = 0;
    for (const payload of rows) {
      const before = deriveState(g);
      const { game: next, committed } = input.handle(payload, g);
      const after = deriveState(next!);
      if (committed) {
        commits++;
        const record = after.history.at(-1)!;
        assert.equal(record.player, before.current);
        assert.equal(record.round, before.round);
        let remaining = before.remaining[before.current], scored = 0;
        for (const dart of g.current) {
          remaining -= dart.score;
          if (remaining < 0 || remaining === 1 || remaining === 0 && dart.multiplier !== 2) { remaining = before.remaining[before.current]; scored = 0; break; }
          scored += dart.score;
          if (!remaining) break;
        }
        assert.equal(record.remaining, remaining);
        assert.equal(record.scored, scored);
      } else {
        assert.equal(after.current, before.current);
        assert.equal(after.history.length, before.history.length);
      }
      g = next!;
    }
    assert.equal(commits, visits);
    assert.equal(g.visits.length, visits);
    assert.equal(g.current.length, 0);
  });
}

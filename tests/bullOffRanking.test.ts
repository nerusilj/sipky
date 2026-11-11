import test from 'node:test';
import assert from 'node:assert/strict';
import { bullDistanceDart, bullThrowLabel, compareBullThrows, rankBullRound } from '../src/game/bullOffRanking.ts';
import { addDart, cancelBullOff, commitVisit, confirmBullOffReview, createGame, decideBullOff, deriveState, makeDart, startFinishBullOff, undo } from '../src/game/x01.ts';
import { parseSavedGame } from '../src/game/gamePersistence.ts';
const hit = (player: number, mm: number) => ({ player, dart: bullDistanceDart(mm) });
const empty = () => ({ ordered: [], pending: [], results: [] });

test('rozhoz seřadí všechny hráče jedním kolem; BULL a 25 mají přednost před milimetry', () => {
  const result = rankBullRound(empty(), [hit(0, 35), hit(1, 11), hit(2, 4), hit(3, 18)]);
  assert.deepEqual(result.ranking.ordered, [2, 1, 3, 0]); assert.equal(result.next, undefined);
  assert.equal(bullThrowLabel(bullDistanceDart(35.24)), '35,2 mm');
  assert.equal(bullThrowLabel(bullDistanceDart(4)), 'BULL'); assert.equal(bullThrowLabel(bullDistanceDart(11)), '25');
});
test('dva BULLy vyvolají rozstřel jen těchto hráčů, nižší místo zůstává zachované', () => {
  const first = rankBullRound(empty(), [hit(0, 2), hit(1, 5), hit(2, 30)]);
  assert.deepEqual(first.next, [0, 1]); assert.deepEqual(first.ranking.pending, [[2]]);
  const second = rankBullRound(first.ranking, [hit(0, 40), hit(1, 50)]);
  assert.deepEqual(second.ranking.ordered, [0, 1, 2]); assert.equal(second.next, undefined);
});
test('nezávislé shody se rozstřelují postupně a už rozhodnutí hráči znovu nehází', () => {
  const first = rankBullRound(empty(), [hit(0, 2), hit(1, 5), hit(2, 10), hit(3, 12), hit(4, 30)]);
  assert.deepEqual(first.next, [0, 1]);
  const second = rankBullRound(first.ranking, [hit(0, 40), hit(1, 50)]);
  assert.deepEqual(second.ranking.ordered, [0, 1]); assert.deepEqual(second.next, [2, 3]);
  const third = rankBullRound(second.ranking, [hit(2, 60), hit(3, 20)]);
  assert.deepEqual(third.ranking.ordered, [0, 1, 3, 2, 4]);
});
test('stejně zobrazené desetiny mm remizují, netrefa prohrává a neplatná vzdálenost se odmítne', () => {
  assert.equal(compareBullThrows(bullDistanceDart(21.21), bullDistanceDart(21.24)), 0);
  assert.ok(compareBullThrows(bullDistanceDart(21.2), bullDistanceDart(21.3)) < 0);
  assert.ok(compareBullThrows(makeDart(0, 0), bullDistanceDart(100)) > 0);
  assert.ok(compareBullThrows({ ...makeDart(25, 2), bouncer: true }, bullDistanceDart(100)) > 0);
  for (const bad of [-1, NaN, Infinity, 1001]) assert.throws(() => bullDistanceDart(bad));
});

const players = ['Radek', 'Olik', 'Franta', 'Pepa'].map((name, index) => ({ id: String(index), name, color: '#ffffff' }));
const play = (game: ReturnType<typeof createGame>, darts: ReturnType<typeof makeDart>[]) => commitVisit(darts.reduce(addDart, game));

test('ruční rozhoz uzavře právě jeden leg, vytvoří úplné pořadí a nezmění průměry', () => {
  let game = createGame({ startScore: 501, doubleOut: true, legsToWin: 2 }, players.slice(0, 3));
  game = startFinishBullOff(game);
  assert.deepEqual(deriveState(game).bullOff?.contenders, [0, 1, 2]);
  game = play(play(play(game, [bullDistanceDart(40)]), [makeDart(25, 2)]), [makeDart(25, 1)]);
  const state = deriveState(game);
  assert.equal(state.leg, 2); assert.equal(state.winner, undefined); assert.equal(state.bullOff, undefined);
  assert.deepEqual(state.lastLegPlaces, [1, 2, 0]); assert.equal(state.lastLegByBullOff, true);
  assert.deepEqual(state.lastBullOffResult?.places, [1, 2, 0]);
  assert.deepEqual(state.legsWon, [0, 1, 0]); assert.deepEqual(state.dartsThrown, [0, 0, 0]); assert.equal(state.history.length, 0);
  assert.deepEqual(state.remaining, [501, 501, 501]);
});
test('dříve zavřený hráč si ponechá první místo; o další místa rozhodnou jen nezavření a jejich rozstřel', () => {
  let game = createGame({ startScore: 101, doubleOut: true, legsToWin: 2, minFinishers: 3 }, players);
  game = play(game, [makeDart(1, 1), makeDart(20, 3), makeDart(20, 2)]);
  assert.deepEqual(deriveState(game).finished, [0]);
  game = startFinishBullOff(game);
  assert.deepEqual(deriveState(game).bullOff?.contenders, [1, 2, 3]);
  game = play(play(play(game, [makeDart(25, 2)]), [makeDart(25, 2)]), [bullDistanceDart(20)]);
  assert.deepEqual(deriveState(game).bullOff?.contenders, [1, 2]); assert.equal(deriveState(game).bullOff?.round, 2);
  game = play(play(game, [bullDistanceDart(40)]), [bullDistanceDart(30)]);
  const state = deriveState(game);
  assert.deepEqual(state.lastLegPlaces, [0, 2, 1, 3]); assert.deepEqual(state.lastBullOffResult?.closedPlayers, [0]);
  assert.deepEqual(state.legsWon, [1, 0, 0, 0]); assert.equal(state.leg, 2); assert.equal(state.history.length, 1);
  assert.equal(state.lastBullOffResult?.rounds.length, 2);
  const reopened = deriveState(undo(game));
  assert.equal(reopened.leg, 1); assert.deepEqual(reopened.bullOff?.contenders, [1, 2]); assert.equal(reopened.current, 2);
  assert.deepEqual(reopened.legsWon, [0, 0, 0, 0]); assert.equal(reopened.lastBullOffResult, undefined);
});

test('potvrzení pořadí ochrání místa zavřených hráčů a upraví pořadí v dalším legu i po přehrání hry', () => {
  let game = createGame({ startScore: 101, doubleOut: true, legsToWin: 2, minFinishers: 2 }, players);
  game = startFinishBullOff(play(game, [makeDart(1, 1), makeDart(20, 3), makeDart(20, 2)]));
  for (const dart of [makeDart(25, 2), makeDart(25, 1), bullDistanceDart(40)]) game = play(game, [dart]);
  assert.deepEqual(deriveState(game).lastLegPlaces, [0, 1, 2, 3]);
  assert.equal(confirmBullOffReview(game, { places: [1, 0, 2, 3], corrections: [] }), game);
  assert.equal(confirmBullOffReview(game, { places: [0, 1, 1, 3], corrections: [] }), game);
  assert.equal(confirmBullOffReview(game, { places: [0, 3, 2, 1], corrections: [{ player: 0, choice: 'BULL' }] }), game);
  const confirmed = confirmBullOffReview(game, { places: [0, 3, 2, 1], corrections: [{ player: 3, choice: 'BULL' }] });
  const saved = parseSavedGame(JSON.stringify({ version: 1, game: confirmed, boardPhase: 'ready' }));
  assert.ok(saved);
  const state = deriveState(play(saved.game, [makeDart(20, 1)]));
  assert.equal(state.leg, 2);
  assert.deepEqual(state.lastLegPlaces, [0, 3, 2, 1]);
  assert.deepEqual(state.order, [1, 2, 3, 0]);
  assert.deepEqual(state.legsWon, [1, 0, 0, 0]);
  assert.equal(state.history.at(-1)?.player, 1);
  assert.equal(state.lastBullOffResult?.rounds[0][2].dart.score, 50);
});
test('rozhoz se nespustí uprostřed hodů, u jediného hráče ani po vítězství a Zpět vrátí jeho zahájení', () => {
  const game = createGame({ startScore: 101, doubleOut: true, legsToWin: 1 }, players.slice(0, 3));
  const live = addDart(game, makeDart(1, 1)); assert.equal(startFinishBullOff(live), live);
  const solo = createGame(game.settings, [players[0]]); assert.equal(startFinishBullOff(solo), solo);
  const won = play(game, [makeDart(1, 1), makeDart(20, 3), makeDart(20, 2)]); assert.equal(startFinishBullOff(won), won);
  assert.deepEqual(undo(startFinishBullOff(game)), game);
  const saved = parseSavedGame(JSON.stringify({ version: 1, game: startFinishBullOff(game), boardPhase: 'ready' }));
  assert.ok(saved); assert.ok(deriveState(saved.game).bullOff?.ranking);
});
test('zásah mimo střed bez souřadnic potřebuje doplnit mm a nepředá tah automaticky', () => {
  let game = startFinishBullOff(createGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players.slice(0, 3)));
  game = addDart(game, makeDart(20, 1));
  assert.equal(commitVisit(game), game);
  assert.equal(bullThrowLabel(game.current[0]), 'Doplnit mm');
});

test('zrušení rozhozu po několika hodech obnoví přesně stav rozehraného legu', () => {
  const before = play(createGame({ startScore: 501, doubleOut: true, legsToWin: 2 }, players), [makeDart(20, 3)]);
  const bull = play(play(startFinishBullOff(before), [makeDart(25, 2)]), [makeDart(25, 1)]);
  const cancelled = cancelBullOff(addDart(bull, bullDistanceDart(40)));
  assert.deepEqual(deriveState(cancelled), { ...deriveState(before), bullOff: undefined });
  assert.deepEqual(undo(cancelled), bull);
  assert.ok(parseSavedGame(JSON.stringify({ version: 1, game: cancelled, boardPhase: 'ready' })));
});

test('zrušení automatického rozhozu vrátí dílčí umístění a uvolní limit pouze pro aktuální leg', () => {
  const checkout = [makeDart(20, 3), makeDart(1, 1), makeDart(20, 2)];
  let game = play(createGame({ startScore: 101, doubleOut: true, legsToWin: 2, maxRounds: 1, minFinishers: 3 }, players), checkout);
  for (let i = 0; i < 3; i++) game = play(game, []);
  game = decideBullOff(game, 2);
  assert.deepEqual(deriveState(game).finished, [0, 2]);
  game = cancelBullOff(game);
  const resumed = deriveState(game);
  assert.deepEqual(resumed.finished, [0]);
  assert.equal(resumed.current, 1);
  assert.equal(resumed.round, 2);
  assert.equal(resumed.bullOff, undefined);
  assert.deepEqual(resumed.legsWon, [0, 0, 0, 0]);
  for (let i = 0; i < 3; i++) game = play(game, []);
  assert.equal(deriveState(game).bullOff, undefined);
  game = play(play(game, checkout), checkout);
  assert.equal(deriveState(game).leg, 2);
  assert.equal(deriveState(game).lastLegByBullOff, false);
  for (let i = 0; i < 4; i++) game = play(game, []);
  assert.ok(deriveState(game).bullOff);
});

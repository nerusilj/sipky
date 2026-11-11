import test from 'node:test';
import assert from 'node:assert/strict';
import { START_SCORES, isStartScore } from '../src/game/startScores.ts';
import { addDart, commitVisit, createGame, deriveState, makeDart, undo } from '../src/game/x01.ts';
import { DEFAULT_SETUP, loadLastSetup, parseLastSetup, saveLastSetup } from '../src/game/lastSetup.ts';

test('všechny varianty X01: odečet, Zpět, zavření doublem a nový leg se stejným skóre', () => {
  for (const startScore of START_SCORES) {
    let game = createGame({ startScore, doubleOut: true, legsToWin: 2 }, [{ id: 'a', name: 'Hráč', color: '#fff' }]);
    const thrown = addDart(game, makeDart(20, 3));
    assert.equal(deriveState(thrown).visitResult.remaining, startScore - 60);
    assert.equal(deriveState(undo(thrown)).visitResult.remaining, startScore);
    while (deriveState(game).remaining[0] > 40) {
      const value = Math.min(20, deriveState(game).remaining[0] - 40);
      game = commitVisit(addDart(game, makeDart(value, 1)));
    }
    const checkout = addDart(game, makeDart(20, 2));
    assert.equal(deriveState(checkout).visitResult.checkout, true);
    const nextLeg = commitVisit(checkout);
    assert.equal(deriveState(nextLeg).legsWon[0], 1);
    assert.equal(deriveState(nextLeg).remaining[0], startScore);
    assert.equal(deriveState(undo(nextLeg)).visitResult.remaining, 40);
  }
});

test('počáteční skóre se pamatuje, starší sestava má výchozích 501', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  for (const startScore of START_SCORES) {
    saveLastSetup({ ...DEFAULT_SETUP, startScore });
    assert.equal(loadLastSetup().startScore, startScore);
  }
  assert.equal(parseLastSetup('{"playerIds":["a"]}').startScore, 501);
  for (const value of [0, 100, 180, 500, 801, 901, 1001, 1101, -301, '701', null, 301.5]) {
    assert.equal(isStartScore(value), false);
    assert.equal(parseLastSetup(JSON.stringify({ startScore: value })).startScore, 501);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAST_PROTOCOL, cricketDisplay, readCastMessage, x01Display } from '../src/cast/protocol.ts';
import { createGame, deriveState, makeDart } from '../src/game/x01.ts';
import { createCricket, deriveCricket } from '../src/game/cricket.ts';

const players = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Hráč ${i + 1}`, color: '#ee5836' }));

test('Cast X01 promítne živý hod a opravu i v dlouhé hře do stejně velkého stavu', () => {
  const game = createGame({ startScore: 101, doubleOut: true, legsToWin: 0 }, players);
  const history = Array.from({ length: 800 }, () => [makeDart(0, 0)]);
  const live = x01Display(deriveState({ ...game, visits: history, current: [makeDart(20, 3)] }), false);
  const corrected = x01Display(deriveState({ ...game, visits: history, current: [makeDart(20, 2)] }), false);
  assert.equal(live.players.find(player => player.active)?.remaining, 41);
  assert.equal(corrected.players.find(player => player.active)?.remaining, 61);
  assert.deepEqual(live.darts, [makeDart(20, 3)]);
  assert.equal(live.players.length, 8);
  assert.equal(live.visit.history.length, 0);
  assert.ok(Buffer.byteLength(JSON.stringify(live)) < 8 * 1024);
});

test('Cast Cricket promítne tabulku i neukončené kolo a používá verzovanou zprávu', () => {
  const game = createCricket({ legsToWin: 3 }, players);
  const current = [makeDart(20, 3), makeDart(20, 1)];
  const gameState = cricketDisplay(deriveCricket({ ...game, current }), current);
  const message = {
    v: CAST_PROTOCOL, type: 'state', seq: 1, snapshot: { venue: 'Šipky', autodartsEnabled: true, boardVisible: true, game: gameState },
  };
  assert.equal(gameState.score.players[0].marks[0], 3);
  assert.equal(gameState.score.players[0].points, 20);
  assert.equal(gameState.score.active, 0);
  assert.deepEqual(readCastMessage(JSON.parse(JSON.stringify(message)))?.type, 'state');
  assert.equal(readCastMessage({ ...message, v: 2 }), undefined);
  assert.equal(readCastMessage({ ...message, seq: 0 }), undefined);
  assert.equal(readCastMessage({ ...message, snapshot: { ...message.snapshot, game: { mode: 'other' } } }), undefined);
  assert.deepEqual(readCastMessage({ v: CAST_PROTOCOL, type: 'offline', seq: 2 }), { v: CAST_PROTOCOL, type: 'offline', seq: 2 });
});

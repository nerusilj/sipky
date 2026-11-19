import test from 'node:test';
import assert from 'node:assert/strict';
import { addShooterDart, commitShooterVisit, createShooter, DEFAULT_SHOOTER_SETTINGS, deriveShooter, setShooterVisit, shooterHit, shooterMiss, shooterTargets, undoShooter } from '../src/game/shooter.ts';
import { makeDart } from '../src/game/x01.ts';
import { readCastMessage, shooterDisplay } from '../src/cast/protocol.ts';

const players = ['Radek', 'Petr'].map((name, i) => ({ id: String(i), name, color: '#fff' }));
test('Shooter: los má pouze cíle 1–20 bez sousedního opakování a přežije replay', () => {
  for (const seed of [0, 1, 123456789, 0xffffffff]) {
    const values = Array.from({ length: 60 }, (_, i) => shooterTargets(seed, i)).flat();
    assert.ok(values.every((n, i) => n >= 1 && n <= 20 && n !== values[i - 1]));
    assert.equal(new Set(values).size, 20);
  }
  let game = createShooter(DEFAULT_SHOOTER_SETTINGS, players, 123);
  const targets = deriveShooter(game).targets;
  game = addShooterDart(game, makeDart(targets[0], 3));
  assert.deepEqual(deriveShooter(JSON.parse(JSON.stringify(game))).targets, targets);
  const corrected = setShooterVisit(game, [makeDart(0, 0)]);
  assert.deepEqual(deriveShooter(corrected).targets, targets);
  assert.deepEqual(deriveShooter(undoShooter(commitShooterVisit(game))).targets, targets);
});
test('Shooter: S/D/T cíle jsou vždy jediný bod, neplatné zásahy a timeout jsou nula', () => {
  for (const multiplier of [1, 2, 3]) assert.equal(shooterHit(makeDart(17, multiplier), 17), true);
  for (const dart of [makeDart(16, 3), makeDart(0, 0), makeDart(25, 2), shooterMiss('timeout'), shooterMiss('skipped'), { ...makeDart(17, 1), bouncer: true }, { ...makeDart(17, 1), score: 34 }]) assert.equal(shooterHit(dart, 17), false);
  let game = createShooter(DEFAULT_SHOOTER_SETTINGS, players, 321);
  for (let i = 0; i < 3; i++) game = addShooterDart(game, makeDart(deriveShooter(game).target!, i + 1));
  assert.deepEqual(deriveShooter(game).points, [3, 0]);
  assert.equal(deriveShooter(game).visitResult.closed, true);
  assert.equal(addShooterDart(game, makeDart(20, 1)), game);
});
test('Shooter: pevná kola mají stejný počet pokusů, remízu a opravitelný výsledek', () => {
  let game = createShooter({ finish: 'rounds', rounds: 5, seconds: 0 }, players, 1);
  for (let i = 0; i < 10; i++) {
    game = commitShooterVisit(game);
    assert.equal(deriveShooter(game).finished, i === 9);
  }
  const state = deriveShooter(game);
  assert.deepEqual(state.winners, [0, 1]);
  assert.deepEqual(state.attempts, [15, 15]);
  assert.deepEqual(state.dartsThrown, [0, 0]);
  assert.equal(state.round, 5);
  assert.equal(commitShooterVisit(game), game);
  game = undoShooter(game);
  assert.equal(deriveShooter(game).finished, false);
  game = addShooterDart(game, makeDart(deriveShooter(game).target!, 2));
  assert.deepEqual(deriveShooter(commitShooterVisit(game)).winners, [1]);
});
test('Shooter: závod končí patnáctým bodem i uprostřed návštěvy a lze jej vrátit', () => {
  let game = createShooter({ finish: 'race', rounds: 10, seconds: 0 }, players.slice(0, 1), 42);
  for (let i = 0; i < 4; i++) {
    for (let d = 0; d < 3; d++) game = addShooterDart(game, makeDart(deriveShooter(game).target!, 1));
    game = commitShooterVisit(game);
  }
  // Připravíme 14 bodů ve dvou pokusech, poslední cíl připadne na další pokus.
  for (let d = 0; d < 2; d++) game = addShooterDart(game, makeDart(deriveShooter(game).target!, 1));
  game = commitShooterVisit(game);
  assert.equal(deriveShooter(game).points[0], 14);
  game = addShooterDart(game, makeDart(deriveShooter(game).target!, 3));
  assert.equal(deriveShooter(game).visitResult.checkout, true);
  assert.equal(deriveShooter(game).finished, false);
  game = commitShooterVisit(game);
  assert.equal(deriveShooter(game).finished, true);
  assert.equal(deriveShooter(game).visit.length, 1);
  assert.equal(deriveShooter(undoShooter(game)).points[0], 14);
});
test('Shooter: odmítá neplatná pravidla, duplicitní a příliš velkou sestavu', () => {
  assert.throws(() => createShooter({ ...DEFAULT_SHOOTER_SETTINGS, seconds: 1 as 10 }, players));
  assert.throws(() => createShooter(DEFAULT_SHOOTER_SETTINGS, []));
  assert.throws(() => createShooter(DEFAULT_SHOOTER_SETTINGS, [players[0], players[0]]));
  assert.throws(() => createShooter(DEFAULT_SHOOTER_SETTINGS, Array.from({ length: 9 }, (_, i) => ({ ...players[0], id: String(i) }))));
});
test('Shooter TV: přenos cíle, oprav, timeoutu a osmi hráčů bez historie; odmítnutí poškozeného stavu', () => {
  const game = createShooter(DEFAULT_SHOOTER_SETTINGS, Array.from({ length: 8 }, (_, i) => ({ ...players[0], id: String(i) })), 9);
  const score = shooterDisplay(deriveShooter({ ...game, current: [shooterMiss('timeout')] }), { phase: 'timeout', remainingMs: 0 });
  const message = (value: unknown) => ({ v: 1, seq: 1, type: 'state', snapshot: { venue: 'Šipky', autodartsEnabled: true, boardVisible: true, game: value } });
  assert.ok(readCastMessage(JSON.parse(JSON.stringify(message(score)))));
  assert.equal(score.score.target, score.score.targets[1]);
  assert.ok(!('history' in score.score));
  assert.ok(Buffer.byteLength(JSON.stringify(score)) < 8000);
  for (const bad of [
    { ...score, clock: { phase: 'running', remainingMs: -1 } },
    { ...score, clock: null }, { ...score, score: null },
    { ...score, score: { ...score.score, current: 9 } },
    { ...score, score: { ...score.score, targets: [21, 1, 2] } },
    { ...score, score: { ...score.score, winners: [8] } },
    { ...score, score: { ...score.score, points: [] } },
  ]) assert.equal(readCastMessage(message(bad)), undefined);
});

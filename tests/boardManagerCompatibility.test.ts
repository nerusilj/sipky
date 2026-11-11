import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import { parseDart, VisitTracker } from '../src/caller/visitTracker.ts';
import { BoardGameInput } from '../src/game/boardInput.ts';
import { createGame, deriveState } from '../src/game/x01.ts';
import { fetchBoardState } from '../src/autodarts/boardState.ts';
import { impactPoint } from '../src/game/dartboardGeometry.ts';
import { feedActiveGame, endAnyGame } from '../src/game/activeGame.ts';
import { startGame, getGameSnapshot } from '../src/game/gameStore.ts';
import { startCricket, getCricketSnapshot } from '../src/game/cricketStore.ts';
import { caller } from '../src/caller/caller.ts';
import { setSoundEnabled } from '../src/settings.ts';

type FlatDart = { segmentName: string; segmentNumber: number; multiplier: number; coordsX: number; coordsY: number; bouncer?: boolean };
const hit = (number: number, multiplier = 1): FlatDart => ({ segmentName: `${'SDT'[multiplier - 1]}${number}`, segmentNumber: number, multiplier, coordsX: .1, coordsY: .2 });
const frame = (throws: unknown[], event = 'throwDetected', status = 'throw') => ({ type: 'state', data: { connected: true, running: true, event, status, throws } });
const players = Array.from({ length: 5 }, (_, index) => ({ id: String(index), name: `Hráč ${index + 1}`, color: '#fff' }));
const freshGame = () => createGame({ startScore: 501, doubleOut: true, legsToWin: 0, minFinishers: 3 }, players);

test('2.1: plochý zásah má stejné body i souřadnice jako 2.0; bouncer nikdy nemá souřadnice středu', () => {
  for (const [number, multiplier] of [[20, 3], [10, 2], [1, 1], [25, 1], [25, 2], [5, 0]]) {
    const flat = hit(number, multiplier);
    flat.segmentName = number === 25 ? multiplier === 2 ? 'Bull' : '25' : multiplier === 0 ? 'M5' : flat.segmentName;
    const legacy = { segment: { name: flat.segmentName, number, multiplier }, coords: { x: flat.coordsX, y: flat.coordsY } };
    assert.deepEqual(parseDart(flat), parseDart(legacy));
    assert.equal(parseDart(flat)?.score, number * multiplier);
    assert.deepEqual(impactPoint(parseDart(flat)!), { x: 17, y: -34 });
  }
  const bouncer = parseDart({ ...hit(0, 0), segmentName: 'Miss', coordsX: 0, coordsY: 0, bouncer: true, failed: true })!;
  assert.equal(bouncer.score, 0); assert.equal(bouncer.distance, undefined); assert.equal(impactPoint(bouncer), undefined);
  for (const invalid of [{}, null, { ...hit(20), segmentNumber: '20' }, hit(25, 3), hit(21), { ...hit(20), multiplier: null }]) assert.equal(parseDart(invalid), undefined);
});

test('2.1: počáteční GET /api/state funguje bez numThrows a zachová původní obsah', async () => {
  for (const data of [frame([]).data, frame([hit(20)]).data]) {
    for (const value of [data, { type: 'state', data }]) {
      const response = (async () => new Response(JSON.stringify(value))) as typeof fetch;
      assert.deepEqual(await fetchBoardState('127.0.0.1', response), { type: 'state', data });
    }
  }
  for (const data of [{}, { throws: 'invalid', numThrows: 0 }, { throws: [hit(20)], numThrows: 0 }, { throws: Array(4).fill(hit(20)) }]) {
    assert.equal(await fetchBoardState('127.0.0.1', (async () => new Response(JSON.stringify(data))) as typeof fetch), undefined);
  }
});

test('2.1: camelCase vytažení zachová původní kolo při ubývání šipek a potvrdí ho právě jednou', () => {
  const input = new BoardGameInput(); let game = freshGame();
  const feed = (payload: unknown) => { const update = input.handle(payload, game); game = update.game!; return update.committed; };
  feed(frame([hit(20), hit(20, 3)]));
  feed(frame([hit(20), hit(20, 3)], 'takeoutStarted', 'takeoutInProgress'));
  feed(frame([hit(20)], 'takeoutStarted', 'takeoutInProgress'));
  assert.equal(deriveState(game).visitResult.scored, 80);
  assert.equal(feed(frame([], 'takeoutStarted', 'takeoutInProgress')), false);
  assert.equal(game.visits.length, 0);
  assert.equal(feed(frame([], 'takeoutFinished')), true);
  assert.equal(deriveState(game).history[0].scored, 80);
  assert.equal(deriveState(game).current, 1);
  assert.equal(feed(frame([], 'takeoutFinished')), false);
  // Board Manager 2.1 někdy ponechá takeoutFinished i u snapshotu s novou první šipkou.
  feed(frame([hit(5)], 'takeoutFinished'));
  assert.equal(deriveState(game).visitResult.scored, 5);
  assert.equal(feed(frame([], 'manualReset')), true);
  assert.equal(game.visits.length, 2);
});

test('2.1: součet neúplného kola se rozpozná při takeoutStarted, bez opakování', () => {
  const tracker = new VisitTracker();
  tracker.handle(frame([hit(20)]));
  tracker.handle(frame([hit(20), hit(25, 1)]));
  const events = tracker.handle(frame([hit(20), hit(25, 1)], 'takeoutStarted', 'takeoutInProgress'));
  assert.deepEqual(events.filter(event => event.kind === 'visit').map(event => event.total), [45]);
  assert.deepEqual(tracker.handle(frame([], 'takeoutFinished')), []);
});

interface RecordedSession {
  source: string; frames: unknown[];
  expected: { commits: number; remaining: number[]; leg: number; current: number; scored: number[]; pending: string[] };
}
// Pouze surové zprávy terče, bez jmen hráčů a ostatních metadat aplikace.
// Očekávání byla spočtena původním enginem nad ručně převedeným formátem 2.0 ještě před opravou parseru.
const sessions: RecordedSession[] = JSON.parse(readFileSync(new URL('./fixtures/board-manager-2.1-sessions.json', import.meta.url), 'utf8'));
for (const session of sessions) {
  test(`2.1 replay ${session.source}: stejné skóre a počet kol jako referenční 2.0`, () => {
    const input = new BoardGameInput(); let game = freshGame();
    for (const payload of session.frames) {
      const before = deriveState(game);
      const update = input.handle(payload, game); game = update.game!;
      if (!update.committed) {
        assert.equal(deriveState(game).current, before.current, 'snapshot ani třetí hod nepřepne hráče');
        assert.equal(deriveState(game).history.length, before.history.length);
      }
    }
    const state = deriveState(game);
    assert.deepEqual({ commits: game.visits.length, remaining: state.remaining, leg: state.leg, current: state.current,
      scored: state.history.map(visit => visit.scored), pending: state.visit.map(dart => dart.name) }, session.expected);
  });
}

test('2.1: zprávy přes společný vstup skutečně zapisují X01 i Cricket a střídají až po vytažení', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); setSoundEnabled(false); endAnyGame();
  const flush = async () => { for (let i = 0; i < 4; i++) { t.mock.timers.tick(1000); await turn(); } };
  try {
    feedActiveGame(frame([])); startGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, players.slice(0, 2));
    feedActiveGame(frame([hit(20, 3), hit(20), hit(5)]));
    assert.equal(getGameSnapshot().state?.visitResult.scored, 85);
    assert.equal(getGameSnapshot().state?.current, 0);
    feedActiveGame(frame([], 'takeoutFinished')); await flush();
    assert.deepEqual(getGameSnapshot().state?.remaining, [416, 501]);
    assert.equal(getGameSnapshot().state?.current, 1);
    endAnyGame();
    feedActiveGame(frame([])); startCricket({ legsToWin: 1 }, players.slice(0, 2));
    feedActiveGame(frame([hit(20, 3), hit(19, 3), hit(18, 3)]));
    assert.equal(getCricketSnapshot().state?.visitResult.marks, 9);
    assert.equal(getCricketSnapshot().state?.current, 0);
    feedActiveGame(frame([], 'takeoutFinished')); await flush();
    assert.deepEqual(getCricketSnapshot().state?.marks[0], [3, 3, 3, 0, 0, 0, 0]);
    assert.equal(getCricketSnapshot().state?.current, 1);
  } finally { endAnyGame(); caller.stop(); t.mock.timers.reset(); }
});

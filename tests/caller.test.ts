import test from 'node:test';
import assert from 'node:assert/strict';
import { czechNumber, scoreAnnouncement } from '../src/caller/czechNumbers.ts';
import { parseDart, VisitTracker } from '../src/caller/visitTracker.ts';
import type { BoardEvent } from '../src/caller/visitTracker.ts';
import { scoreSoundUrl } from '../src/caller/caller.ts';
import { normalizeVoice, parseDisabledEffects } from '../src/settings.ts';
import { phraseSoundUrl } from '../src/caller/phrases.ts';
import { matchEffects } from '../src/effects/effectRules.ts';

test('Ambrožovina: kolo S1, S20, S5 v libovolném pořadí, jen když je efekt zapnutý', () => {
  const dart = (number: number, multiplier = 1) => ({ name: `${'SDT'[multiplier - 1] ?? 'M'}${number}`, number, multiplier, score: number * multiplier });
  const visit = (...darts: ReturnType<typeof dart>[]): BoardEvent => ({ kind: 'visit', darts, total: darts.reduce((s, d) => s + d.score, 0) });
  const on = () => true;
  assert.deepEqual(matchEffects(visit(dart(1), dart(20), dart(5)), on), ['ambrozovina']);
  assert.deepEqual(matchEffects(visit(dart(5), dart(1), dart(20)), on), ['ambrozovina']);
  for (const other of [visit(dart(1, 3), dart(20), dart(5)), visit(dart(20), dart(5)), visit(dart(20), dart(6), dart(0, 0)), visit(dart(1), dart(20), dart(20))]) {
    assert.deepEqual(matchEffects(other, on), []);
  }
  assert.deepEqual(matchEffects({ kind: 'dart', index: 0, dart: dart(1) }, on), []);
  assert.deepEqual(matchEffects(visit(dart(1), dart(20), dart(5)), () => false), []);
  assert.equal(phraseSoundUrl('ambrozovina', 'kasandra'), '/sounds/cs/kasandra/fun/ambrozovina.wav');
  assert.deepEqual(parseDisabledEffects('["ambrozovina","neznamy",1,"ambrozovina"]'), ['ambrozovina']);
  assert.deepEqual(parseDisabledEffects('nejson'), []);
});

test('nahrávka hlášení podle hlasu; neznámý hlas se vrátí na Jirku', () => {
  assert.equal(scoreSoundUrl(180, 'kasandra'), '/sounds/cs/kasandra/score/180.wav');
  assert.equal(scoreSoundUrl(0, 'jirka'), '/sounds/cs/jirka/score/0.wav');
  assert.throws(() => scoreSoundUrl(181, 'jirka'));
  assert.throws(() => scoreSoundUrl(60, '../x' as never));
  assert.equal(normalizeVoice('kasandra'), 'kasandra');
  for (const bad of [null, '', 'hasOwnProperty', 'pepa']) assert.equal(normalizeVoice(bad), 'jirka');
});

test('čísla se vysloví česky', () => {
  const cases: [number, string][] = [[0, 'nula'], [1, 'jedna'], [2, 'dva'], [15, 'patnáct'], [20, 'dvacet'], [26, 'dvacet šest'],
    [45, 'čtyřicet pět'], [99, 'devadesát devět'], [100, 'sto'], [101, 'sto jedna'], [140, 'sto čtyřicet'], [171, 'sto sedmdesát jedna'], [180, 'sto osmdesát']];
  for (const [n, words] of cases) assert.equal(czechNumber(n), words, String(n));
  assert.equal(scoreAnnouncement(60), 'Šedesát.');
  assert.equal(scoreAnnouncement(180), 'Sto osmdesát!');
  assert.throws(() => scoreAnnouncement(181));
  assert.throws(() => scoreAnnouncement(-1));
});

const seg = (name: string, number: number, multiplier: number) => ({ segment: { name, number, multiplier, bed: 'x' }, coords: { x: 0, y: 0 } });
const T20 = seg('T20', 20, 3), S20 = seg('S20', 20, 1), D10 = seg('D10', 10, 2), BULL = seg('Bull', 25, 2), OUTER = seg('25', 25, 1), MISS = seg('M', 0, 0);
const state = (throws: unknown[], extra: Record<string, unknown> = {}) =>
  ({ type: 'state', data: { connected: true, running: true, status: 'Throw', event: 'Throw detected', numThrows: throws.length, throws, ...extra } });
const visits = (events: BoardEvent[]) => events.filter(e => e.kind === 'visit').map(e => e.kind === 'visit' ? e.total : -1);

test('body šipky včetně bullu, 25 a netrefy; neplatné hodnoty se odmítnou', () => {
  assert.equal(parseDart(T20)?.score, 60);
  assert.equal(parseDart(BULL)?.score, 50);
  assert.equal(parseDart(OUTER)?.score, 25);
  assert.equal(parseDart(MISS)?.score, 0);
  for (const bad of [seg('T25', 25, 3), seg('x', 21, 1), seg('x', 20, 4), { segment: { number: '20', multiplier: 1 } }, null, {}]) assert.equal(parseDart(bad), undefined);
});

test('kolo tří šipek se ohlásí jednou, po třetí šipce', () => {
  const tracker = new VisitTracker();
  assert.deepEqual(tracker.handle(state([T20])).map(e => e.kind), ['dart']);
  assert.deepEqual(visits(tracker.handle(state([T20, T20]))), []);
  const third = tracker.handle(state([T20, T20, T20]));
  assert.deepEqual(third.map(e => e.kind), ['dart', 'visit']);
  assert.deepEqual(visits(third), [180]);
  assert.deepEqual(visits(tracker.handle(state([T20, T20, T20], { status: 'Takeout in progress', event: 'Takeout started' }))), []);
  assert.deepEqual(visits(tracker.handle(state([], { event: 'Takeout finished' }))), []);
  assert.deepEqual(visits(tracker.handle(state([S20, D10, MISS]))), [40]);
});

test('méně než tři šipky se ohlásí při vytažení; další kolo začíná znovu', () => {
  const tracker = new VisitTracker();
  tracker.handle(state([S20]));
  tracker.handle(state([S20, OUTER]));
  assert.deepEqual(visits(tracker.handle(state([S20, OUTER], { status: 'Takeout in progress', event: 'Takeout started' }))), [45]);
  tracker.handle(state([], { event: 'Takeout finished' }));
  tracker.handle(state([BULL]));
  tracker.handle(state([BULL, MISS]));
  assert.deepEqual(visits(tracker.handle(state([BULL, MISS, D10]))), [70]);
});

test('zmizení šipek bez „Takeout started“ kolo také ohlásí', () => {
  const tracker = new VisitTracker();
  tracker.handle(state([T20]));
  assert.deepEqual(visits(tracker.handle({ type: 'state', data: { numThrows: 0, event: 'Manual reset' } })), [60]);
});

test('opravená šipka změní ohlášený součet, pokud kolo ještě nebylo ohlášeno', () => {
  const tracker = new VisitTracker();
  tracker.handle(state([T20]));
  tracker.handle(state([S20], { event: 'Dart corrected' }));
  tracker.handle(state([S20, S20]));
  assert.deepEqual(visits(tracker.handle(state([S20, S20, T20]))), [100]);
});

test('jiné zprávy než state ani neplatné šipky nic nevyvolají', () => {
  const tracker = new VisitTracker();
  for (const payload of [null, 'text', { type: 'motion_state', data: { isHand: true } }, { type: 'state', data: null }, state([{ segment: { number: 99, multiplier: 1 } }])]) {
    assert.deepEqual(tracker.handle(payload), []);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDart } from '../src/caller/visitTracker.ts';
import { BOARD_NUMBERS, impactPoint, polar, segmentHighlight } from '../src/game/dartboardGeometry.ts';
import { BoardGameInput } from '../src/game/boardInput.ts';
import { createGame, makeDart } from '../src/game/x01.ts';

const detected = { coords: { x: -.06476475623303757, y: .8058694740800862 }, segment: { name: 'S20', number: 20, multiplier: 1 } };
const frame = (throws: unknown[]) => ({ type: 'state', data: { connected: true, running: true, numThrows: throws.length, throws } });

test('skutečný zásah S20 z uživatelova záznamu je vlevo nahoře; střed a měřítko se zachovají', () => {
  const dart = parseDart(detected)!;
  assert.deepEqual(dart.coords, detected.coords);
  const point = impactPoint(dart)!;
  assert.equal(point.x, detected.coords.x * 170);
  assert.equal(point.y, -detected.coords.y * 170);
  assert.ok(point.x < 0 && point.y < 0);
  assert.deepEqual(impactPoint({ ...makeDart(25, 2), coords: { x: 0, y: 0 } }), { x: 0, y: -0 });
  assert.equal(polar(170, 0).y, -170);
  assert.ok(Math.abs(polar(170, 90).x - 170) < .001);
  assert.equal(BOARD_NUMBERS[5], 6);
  assert.equal(BOARD_NUMBERS[10], 3);
});

test('ruční hod nemá smyšlenou tečku; odražené a neplatné souřadnice se nezobrazují', () => {
  const manual = makeDart(20, 3);
  assert.equal(impactPoint(manual), undefined);
  assert.deepEqual(segmentHighlight(manual), { inner: 99, outer: 107, angle: 0 });
  assert.equal(segmentHighlight(parseDart(detected)!), undefined);
  assert.equal(segmentHighlight(makeDart(0, 0)), undefined);
  const bounce = parseDart({ ...detected, bouncer: true })!;
  assert.equal(bounce.coords, undefined); assert.equal(impactPoint(bounce), undefined);
  assert.equal(parseDart({ ...detected, coords: { x: NaN, y: 1 } })!.coords, undefined);
});

test('poloha projde do hry, ruční oprava ji odstraní a další hráč začíná bez značek', () => {
  const input = new BoardGameInput();
  let game = createGame({ startScore: 501, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'A', color: '#fff' }, { id: 'b', name: 'B', color: '#fff' },
  ]);
  input.begin(); input.handle(frame([]), game);
  game = input.handle(frame([detected]), game).game!;
  assert.deepEqual(game.current[0].coords, detected.coords);
  input.overrideDart(0, makeDart(1, 1));
  game = input.handle(frame([detected]), game).game!;
  assert.equal(game.current[0].coords, undefined);
  const next = input.handle(frame([]), game);
  assert.equal(next.committed, true);
  assert.equal(next.game!.current.length, 0);
});
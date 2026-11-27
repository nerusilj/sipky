import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TV_WIDTH, TV_HEIGHT, tvViewport } from '../src/cast/layout.ts';

test('TV používá dostupný viewport pro 720p, Full HD i 4K a zachovává poměr stran', () => {
  for (const [width, height, scale] of [[1280, 720, 2 / 3], [1920, 1080, 1], [3840, 2160, 2], [1024, 768, 1024 / 1920]]) {
    const actual = tvViewport(width, height);
    assert.equal(actual.scale, scale);
    assert.ok(TV_WIDTH * scale <= width);
    assert.ok(TV_HEIGHT * scale <= height);
    assert.equal(actual.width, width);
    assert.equal(actual.height, height);
  }
});

test('TV přežije dočasně nulový nebo neplatný rozměr při inicializaci', () => {
  for (const value of [0, -1, NaN, Infinity]) {
    const actual = tvViewport(value, value);
    assert.deepEqual(actual, { width: TV_WIDTH, height: TV_HEIGHT, scale: 1 });
  }
});

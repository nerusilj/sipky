import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, normalizeDartTheme, normalizeVenueName } from '../src/settings.ts';
import { DART_THEMES, DEFAULT_DART_THEME } from '../src/dartThemes.ts';

test('neznámá nebo podvržená šipka se vrátí na výchozí tyrkysovou', () => {
  assert.equal(DEFAULT_DART_THEME, 'teal');
  assert.equal(normalizeDartTheme('amber'), 'amber');
  for (const bad of [null, '', 'toString', '__proto__', 'neon', 42]) assert.equal(normalizeDartTheme(bad), 'teal', String(bad));
  assert.equal(Object.keys(DART_THEMES).length, 8);
});

test('název podniku se očistí a prázdný se vrátí na výchozí', () => {
  assert.equal(normalizeVenueName('  Hospoda   U Terče '), 'Hospoda U Terče');
  assert.equal(normalizeVenueName('   '), DEFAULT_VENUE_NAME);
  assert.equal(normalizeVenueName('x'.repeat(50)).length, MAX_VENUE_NAME);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, normalizeVenueName } from '../src/settings.ts';

test('název podniku se očistí a prázdný se vrátí na výchozí', () => {
  assert.equal(normalizeVenueName('  Hospoda   U Terče '), 'Hospoda U Terče');
  assert.equal(normalizeVenueName('   '), DEFAULT_VENUE_NAME);
  assert.equal(normalizeVenueName('x'.repeat(50)).length, MAX_VENUE_NAME);
});

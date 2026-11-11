import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerSpeechCache, playerSpeechKey } from '../src/caller/playerSpeechCache.ts';
import type { VoiceId } from '../src/caller/voices.ts';

test('jméno a hlas určují nahrávku; přejmenování vytvoří novou, odebrání a přidání stejného jména ji znovu využije', async () => {
  const calls: string[] = [];
  const cache = new PlayerSpeechCache(async (name, voice) => { calls.push(`${voice}/${name}`); return `blob:${calls.length}`; });
  const first = cache.prepare('  Radek ', 'eliska');
  assert.equal(cache.prepare('Radek', 'eliska'), first);
  assert.equal(await first, 'blob:1');
  assert.equal(await cache.prepare('Radek', 'eliska'), 'blob:1');
  assert.equal(await cache.prepare('Pepa', 'eliska'), 'blob:2');
  assert.equal(await cache.prepare('Radek', 'martin'), 'blob:3');
  assert.equal(await cache.prepare('Radek', 'eliska'), 'blob:1');
  assert.deepEqual(calls, ['eliska/Radek', 'eliska/Pepa', 'martin/Radek']);
  assert.equal(playerSpeechKey('Ja\u0301', 'eliska'), playerSpeechKey('Já', 'eliska'));
});

test('generování je postupné, chyba se dá opakovat a paměťová cache je omezená', async () => {
  let active = 0, maximum = 0, fail = true;
  const released: string[] = [];
  const cache = new PlayerSpeechCache(async (name, voice: VoiceId) => {
    active++; maximum = Math.max(maximum, active);
    await Promise.resolve(); active--;
    if (name === 'Pepa' && fail) throw Error('Hlasatel nedostupný');
    return `${voice}/${name}`;
  }, url => released.push(url), 2);
  await Promise.all(['Radek', 'Pepa', 'Olik'].map(name => cache.prepare(name, 'eliska')));
  assert.equal(maximum, 1);
  fail = false;
  assert.equal(await cache.prepare('Pepa', 'eliska'), 'eliska/Pepa');
  assert.deepEqual(released, ['eliska/Radek']);
  assert.equal(cache.get().pending, 0);
});

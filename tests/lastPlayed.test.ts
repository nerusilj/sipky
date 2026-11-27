import test from 'node:test';
import assert from 'node:assert/strict';
import { getLastPlayedMode, parseLastPlayedMode, rememberLastPlayedMode } from '../src/game/lastPlayed.ts';

test('poslední hra: chybějící a neplatný režim nevybírá automaticky X01', () => {
  for (const value of [null, '', 'unknown', 'X01', '{"mode":"cricket"}']) {
    assert.equal(parseLastPlayedMode(value), undefined);
  }
  for (const mode of ['x01', 'cricket', 'shooter'] as const) assert.equal(parseLastPlayedMode(mode), mode);
});

test('poslední hra: uložený režim přežije nové načtení modulu', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    assert.equal(getLastPlayedMode(), undefined);
    rememberLastPlayedMode('cricket');
    const reloaded = await import('../src/game/lastPlayed.ts?reloaded');
    assert.equal(reloaded.getLastPlayedMode(), 'cricket');
    rememberLastPlayedMode('shooter');
    assert.equal(getLastPlayedMode(), 'shooter');
    assert.equal(values.get('sipky.lastPlayedMode'), 'shooter');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('poslední hra: nedostupný zápis ani čtení neblokuje návrat v témže spuštění', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
  } });
  try {
    rememberLastPlayedMode('x01');
    assert.equal(getLastPlayedMode(), 'x01');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
    rememberLastPlayedMode('cricket');
    assert.equal(getLastPlayedMode(), 'cricket');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

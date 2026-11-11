import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAudioSource } from '../src/caller/audioSource.ts';

const wav = () => new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69]).buffer;

test('desktop načítá statické WAV přes Rust IPC, ne přes fetch, a uvolní blob', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  try {
    let requested: unknown;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { __TAURI_INTERNALS__: {
      invoke: async (command: string, args: unknown) => { requested = { command, args }; return wav(); },
    } } });
    globalThis.fetch = async () => { throw new Error('Interní webová adresa se nesmí použít.'); };
    const source = await loadAudioSource('/sounds/cs/eliska/score/180.wav', true);
    assert.deepEqual(requested, { command: 'static_audio', args: { url: '/sounds/cs/eliska/score/180.wav' } });
    assert.match(source.url, /^blob:/);
    assert.equal((await originalFetch(source.url)).headers.get('content-type'), 'audio/wav');
    source.release();
    await assert.rejects(originalFetch(source.url));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('chyba IPC a neplatný WAV se nepředají přehrávači; jména a web se nemění', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { __TAURI_INTERNALS__: {
      invoke: async () => { throw new Error('Nahrávka chybí.'); },
    } } });
    await assert.rejects(loadAudioSource('/sounds/game/miss.wav', true), /Nahrávka chybí/);
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { __TAURI_INTERNALS__: {
      invoke: async () => new TextEncoder().encode('<html>fallback</html>').buffer,
    } } });
    await assert.rejects(loadAudioSource('/sounds/cs/martin/score/60.wav', true), /Chybí WAV/);
    assert.equal((await loadAudioSource('blob:player-name', true)).url, 'blob:player-name');
    assert.equal((await loadAudioSource('/sounds/game/bust.wav', false)).url, '/sounds/game/bust.wav');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
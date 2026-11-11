import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { eventsUrl, stateUrl, versionUrl } from '../src/autodarts/boardAddress.ts';
import { fetchBoardState } from '../src/autodarts/boardState.ts';
import { fetchBoardVersion, isVerifiedBoardVersion, parseVersion } from '../src/autodarts/boardVersion.ts';
import { LocalBoardClient, RECONNECT_MAX_MS } from '../src/autodarts/LocalBoardClient.ts';
import type { ListenSocket } from '../src/autodarts/LocalBoardClient.ts';
import type { ConnectionState } from '../src/autodarts/types.ts';
import type { CapturedWsMessage } from '../src/inspector/types.ts';
import { boardConnection } from '../src/connection.ts';

class FakeSocket implements ListenSocket {
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  readonly url: string;
  constructor(url: string) { this.url = url; }
  close() { this.closed = true; }
  // Klient nesmí nikdy nic odeslat.
  send() { throw new Error('send() zavoláno'); }
}

function setup() {
  const sockets: FakeSocket[] = [];
  const states: ConnectionState[] = [];
  const messages: CapturedWsMessage[] = [];
  const client = new LocalBoardClient('127.0.0.1:3180', url => { const s = new FakeSocket(url); sockets.push(s); return s; });
  client.onState(state => states.push(state));
  client.onMessage(message => messages.push(message));
  return { client, sockets, states, messages };
}

test('adresa vede vždy jen na /api/events přes ws', () => {
  assert.equal(eventsUrl('127.0.0.1'), 'ws://127.0.0.1:3180/api/events');
  assert.equal(eventsUrl(' board.local:3181 '), 'ws://board.local:3181/api/events');
  for (const bad of ['', 'ws://127.0.0.1:3180', '127.0.0.1:3180/api/start', '127.0.0.1:0', '127.0.0.1:70000', 'a b', 'host:', '-bad']) {
    assert.throws(() => eventsUrl(bad), undefined, bad);
  }
});

test('verze se čte jen přes GET /api/version a zobrazí se jen platné číslo verze', async () => {
  assert.equal(versionUrl('127.0.0.1'), 'http://127.0.0.1:3180/api/version');
  assert.throws(() => versionUrl('127.0.0.1/api/system'));
  assert.equal(parseVersion('2.0.2\n'), '2.0.2');
  assert.equal(parseVersion('v1.0.7'), 'v1.0.7');
  assert.equal(parseVersion('2.1.0-beta.1'), '2.1.0-beta.1');
  for (const version of ['2.0.2', '2.1.0', 'v2.1.0']) assert.equal(isVerifiedBoardVersion(version), true, version);
  for (const version of ['2.0.3', '2.1.0-beta.1', '2.2.0']) assert.equal(isVerifiedBoardVersion(version), false, version);
  for (const bad of ['', '<html>', 'api key 123', '2.0.2 extra']) assert.equal(parseVersion(bad), undefined, bad);
  const calls: [string, RequestInit | undefined][] = [];
  const ok = (async (url: string, init?: RequestInit) => { calls.push([url, init]); return new Response('2.0.2\n'); }) as typeof fetch;
  assert.equal(await fetchBoardVersion('127.0.0.1:3180', ok), '2.0.2');
  assert.equal(calls[0][0], 'http://127.0.0.1:3180/api/version');
  assert.equal(calls[0][1]?.method, 'GET');
  const failing = (async () => { throw new TypeError('offline'); }) as typeof fetch;
  assert.equal(await fetchBoardVersion('127.0.0.1:3180', failing), undefined);
  const notFound = (async () => new Response('nope', { status: 404 })) as typeof fetch;
  assert.equal(await fetchBoardVersion('127.0.0.1:3180', notFound), undefined);
});

test('po obnovení spojení se ukáže verze z nového připojení, i když starý dotaz doběhne později', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sockets: FakeSocket[] = [];
  t.mock.method(globalThis, 'WebSocket', function (url: string) {
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  const replies: ((response: Response) => void)[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('/api/version')
    ? new Promise<Response>(resolve => replies.push(resolve)) : new Response(null, { status: 404 }));
  try {
    boardConnection.connect('board.local');
    sockets[0].onopen!();
    assert.equal(boardConnection.get().versionLoading, true);
    sockets[0].onclose!();
    assert.equal(boardConnection.get().versionLoading, false);
    t.mock.timers.tick(RECONNECT_MAX_MS);
    sockets[1].onopen!();
    replies[1](new Response('2.1.0'));
    await turn();
    assert.equal(boardConnection.get().version, '2.1.0');
    assert.equal(boardConnection.get().versionLoading, false);
    replies[0](new Response('2.0.2'));
    await turn();
    assert.equal(boardConnection.get().version, '2.1.0');
    sockets[1].onclose!();
    assert.equal(boardConnection.get().version, undefined);
    t.mock.timers.tick(RECONNECT_MAX_MS);
    sockets[2].onopen!();
    replies[2](new Response(null, { status: 404 }));
    await turn();
    assert.equal(boardConnection.get().state, 'connected');
    assert.equal(boardConnection.get().version, undefined);
    assert.equal(boardConnection.get().versionLoading, false);
  } finally { boardConnection.disconnect(); }
});

test('počáteční šipky se čtou jen přes GET /api/state, bez klíčů a ovládacích endpointů', async () => {
  assert.equal(stateUrl('board.local:3181'), 'http://board.local:3181/api/state');
  assert.throws(() => stateUrl('board.local/api/config'));
  const data = { numThrows: 1, throws: [{ segment: { name: 'S20', number: 20, multiplier: 1 } }] };
  const calls: [string, RequestInit | undefined][] = [];
  const response = (value: unknown) => (async (url: string, init?: RequestInit) => {
    calls.push([url, init]); return new Response(JSON.stringify(value));
  }) as typeof fetch;
  assert.deepEqual(await fetchBoardState('board.local', response(data)), { type: 'state', data });
  assert.deepEqual(await fetchBoardState('board.local', response({ type: 'state', data })), { type: 'state', data });
  assert.equal(calls[0][0], 'http://board.local:3180/api/state');
  assert.equal(calls[0][1]?.method, 'GET');
  for (const invalid of [null, [], {}, { numThrows: 4 }, { numThrows: '1' }]) assert.equal(await fetchBoardState('board.local', response(invalid)), undefined);
  assert.equal(await fetchBoardState('board.local', (async () => { throw new Error('offline'); }) as typeof fetch), undefined);
});

test('připojí se, předá zprávy beze změny a nic neodešle', () => {
  const { client, sockets, states, messages } = setup();
  client.connect();
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].url, 'ws://127.0.0.1:3180/api/events');
  assert.equal(sockets[0].binaryType, 'arraybuffer');
  sockets[0].onopen!();
  sockets[0].onmessage!({ data: '{"type":"state","data":{"numThrows":1}}' });
  sockets[0].onmessage!({ data: new TextEncoder().encode('{"type":"stats"}').buffer });
  assert.deepEqual(states, ['disconnected', 'connecting', 'connected']);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].raw, '{"type":"state","data":{"numThrows":1}}');
  assert.equal(messages[0].direction, 'in');
  assert.equal(messages[1].raw, '{"type":"stats"}');
  assert.ok(messages[1].id > messages[0].id);
  client.disconnect();
  assert.ok(sockets[0].closed);
  assert.equal(states.at(-1), 'disconnected');
});

test('po ztrátě spojení se obnoví s omezeným odstupem, odpojení obnovu zastaví', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, sockets, states } = setup();
  client.connect();
  for (let i = 0; i < 8; i++) {
    sockets.at(-1)!.onclose!();
    assert.equal(states.at(-1), 'reconnecting');
    t.mock.timers.tick(RECONNECT_MAX_MS);
    assert.equal(sockets.length, i + 2);
  }
  sockets.at(-1)!.onopen!();
  assert.equal(states.at(-1), 'connected');
  sockets.at(-1)!.onclose!();
  client.disconnect();
  t.mock.timers.tick(RECONNECT_MAX_MS * 2);
  assert.equal(sockets.length, 9);
  assert.equal(states.at(-1), 'disconnected');
});

test('zavření starého socketu po odpojení nic nespustí', () => {
  const { client, sockets, states } = setup();
  client.connect();
  const old = sockets[0];
  client.disconnect();
  assert.equal(old.onclose, null);
  assert.equal(states.at(-1), 'disconnected');
});

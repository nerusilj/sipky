import test from 'node:test';
import assert from 'node:assert/strict';
import { eventsUrl } from '../src/autodarts/boardAddress.ts';
import { LocalBoardClient, RECONNECT_MAX_MS } from '../src/autodarts/LocalBoardClient.ts';
import type { ListenSocket } from '../src/autodarts/LocalBoardClient.ts';
import type { ConnectionState } from '../src/autodarts/types.ts';
import type { CapturedWsMessage } from '../src/inspector/types.ts';

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

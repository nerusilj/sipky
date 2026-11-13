import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { eventsUrl, stateUrl, versionUrl } from '../src/autodarts/boardAddress.ts';
import { fetchBoardState } from '../src/autodarts/boardState.ts';
import { boardStartStopAction, boardStatusDisplay } from '../src/autodarts/boardStatus.ts';
import { fetchBoardVersion, isVerifiedBoardVersion, parseVersion } from '../src/autodarts/boardVersion.ts';
import { LocalBoardClient, RECONNECT_MAX_MS } from '../src/autodarts/LocalBoardClient.ts';
import type { ListenSocket } from '../src/autodarts/LocalBoardClient.ts';
import type { ConnectionState } from '../src/autodarts/types.ts';
import type { CapturedWsMessage } from '../src/inspector/types.ts';
import { boardConnection } from '../src/connection.ts';
import { endGame, enterDart, getGameSnapshot, startGame } from '../src/game/gameStore.ts';
import { endCricket, enterCricketDart, getCricketSnapshot, startCricket } from '../src/game/cricketStore.ts';
import { makeDart } from '../src/game/x01.ts';
import { isAutodartsEnabled, isSoundEnabled, setSoundEnabled } from '../src/settings.ts';

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

test('stav detekce lze číst i bez rozpoznaných šipek a opožděný GET nepřepíše živý stav', async t => {
  const sockets: FakeSocket[] = [];
  t.mock.method(globalThis, 'WebSocket', function (url: string) {
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  let sendSnapshot!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('/api/version')
    ? new Response('2.1.0') : new Promise<Response>(resolve => { sendSnapshot = resolve; }));

  try {
    boardConnection.connect('board.local');
    const socket = sockets[0];
    socket.onopen!();
    socket.onmessage!({ data: '{"type":"state","data":{"status":"takeoutInProgress"}}' });
    sendSnapshot(new Response('{"status":"Starting"}'));
    await turn();
    assert.equal(boardConnection.get().boardStatus, 'takeoutInProgress');
    assert.deepEqual(boardStatusDisplay('Takeout in progress'), { label: 'Vyjímání šipek', tone: 'yellow' });
    assert.deepEqual(boardStatusDisplay('takeout'), { label: 'Vyjměte šipky', tone: 'green' });
    assert.equal(boardStartStopAction(boardConnection.get().boardStatus), 'stop');
    assert.deepEqual(boardStatusDisplay('nextStatus'), { label: 'nextStatus', tone: 'neutral' });

    boardConnection.disconnect();
    assert.equal(boardConnection.get().boardStatus, undefined);
    boardConnection.connect('board.local');
    sockets[1].onopen!();
    sendSnapshot(new Response('{"status":"Stopped","running":false}'));
    await turn();
    assert.equal(boardConnection.get().boardStatus, 'Stopped');
    assert.equal(boardStartStopAction(boardConnection.get().boardStatus), 'start');
  } finally { boardConnection.disconnect(); }
});

test('ovládání Autodarts odešle jeden příkaz, načte stav a zobrazí odmítnutí', async t => {
  const sockets: FakeSocket[] = [];
  t.mock.method(globalThis, 'WebSocket', function (url: string) {
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  let status = 'Takeout in progress';
  const getState = t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('/api/version')
    ? new Response('2.1.0') : Response.json({ status }));
  let finishReset!: () => void;
  const invoke = t.mock.fn(async (_command: string, { action }: { action: string }) => {
    if (action === 'stop') throw 'Autodarts příkaz odmítl (HTTP 409).';
    await new Promise<void>(resolve => { finishReset = resolve; });
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { __TAURI_INTERNALS__: { invoke } } });

  try {
    await boardConnection.controlBoard('start');
    assert.equal(invoke.mock.callCount(), 0);
    boardConnection.connect('board.local:3181');
    sockets[0].onopen!();
    await turn();
    assert.equal(boardConnection.get().boardStatus, 'Takeout in progress');

    const reset = boardConnection.controlBoard('reset');
    assert.equal(boardConnection.get().commandPending, 'reset');
    await boardConnection.controlBoard('stop');
    assert.equal(invoke.mock.callCount(), 1);
    assert.deepEqual(invoke.mock.calls[0].arguments.slice(0, 2), ['send_board_command', { address: 'board.local:3181', action: 'reset' }]);
    status = 'Throw';
    finishReset();
    await reset;
    await turn();
    assert.equal(boardConnection.get().boardStatus, 'Throw');
    assert.deepEqual(boardConnection.get().commandResult, { action: 'reset', error: undefined });

    const count = getState.mock.callCount();
    await boardConnection.controlBoard('stop');
    assert.equal(getState.mock.callCount(), count);
    assert.deepEqual(boardConnection.get().commandResult, { action: 'stop', error: 'Autodarts příkaz odmítl (HTTP 409).' });
    boardConnection.disconnect();
    assert.equal(boardConnection.get().commandResult, undefined);
  } finally {
    boardConnection.disconnect();
    Reflect.deleteProperty(globalThis, 'window');
  }
});

test('vypnutí Autodarts zachová ruční hru a zapnutí počká na čistý terč', async t => {
  const sockets: FakeSocket[] = [];
  t.mock.method(globalThis, 'WebSocket', function (url: string) {
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  const saved = new Map<string, string>();
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
  } });
  const replies: ((response: Response) => void)[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('/api/version')
    ? new Response('2.1.0') : new Promise<Response>(resolve => replies.push(resolve)));
  const frame = (...numbers: number[]) => ({ type: 'state', data: {
    status: 'throw', running: true, throws: numbers.map(n => ({ segmentNumber: n, multiplier: 1, segmentName: `S${n}` })),
  } });
  const players = [{ id: 'a', name: 'A', color: '#fff' }, { id: 'b', name: 'B', color: '#aaa' }];
  const x01 = { startScore: 301, doubleOut: false, legsToWin: 1 };
  const sound = isSoundEnabled();
  setSoundEnabled(false);

  try {
    assert.equal(isAutodartsEnabled(), true);
    boardConnection.connect('board.local');
    sockets[0].onopen!();
    startGame(x01, players);
    startCricket({ legsToWin: 1 }, players);
    const oldMessage = sockets[0].onmessage!;
    oldMessage({ data: JSON.stringify(frame(20)) });

    boardConnection.setEnabled(false);
    assert.equal(saved.get('sipky.autodartsEnabled'), 'false');
    assert.equal(sockets[0].closed, true);
    assert.equal(boardConnection.get().state, 'disconnected');
    oldMessage({ data: JSON.stringify(frame(20, 18)) });
    replies[0](Response.json(frame(20, 18).data));
    boardConnection.start();
    boardConnection.connect('board.local');
    await turn();
    assert.equal(sockets.length, 1);
    assert.equal(boardConnection.get().version, undefined);
    assert.equal(getGameSnapshot().boardPhase, 'manual');
    assert.equal(getCricketSnapshot().boardPhase, 'manual');
    assert.deepEqual(getGameSnapshot().game?.current.map(dart => dart.number), [20]);
    assert.deepEqual(getCricketSnapshot().game?.current.map(dart => dart.number), [20]);
    enterDart(makeDart(19, 1));
    enterCricketDart(makeDart(19, 1));
    assert.deepEqual(getGameSnapshot().game?.current.map(dart => dart.number), [20, 19]);
    assert.deepEqual(getCricketSnapshot().game?.current.map(dart => dart.number), [20, 19]);

    boardConnection.setEnabled(true);
    assert.equal(saved.get('sipky.autodartsEnabled'), 'true');
    assert.equal(sockets.length, 2);
    assert.equal(sockets[1].url, 'ws://board.local:3180/api/events');
    sockets[1].onopen!();
    startGame(x01, players);
    startCricket({ legsToWin: 1 }, players);
    replies[1](Response.json(frame(20).data));
    await turn();
    const message = (...numbers: number[]) => sockets[1].onmessage!({ data: JSON.stringify(frame(...numbers)) });
    message(20, 18);
    assert.equal(getGameSnapshot().game?.current.length, 0);
    assert.equal(getCricketSnapshot().game?.current.length, 0);
    message();
    message(17);
    assert.equal(getGameSnapshot().game?.current[0].number, 17);
    assert.equal(getCricketSnapshot().game?.current[0].number, 17);
  } finally {
    endGame(); endCricket();
    if (!isAutodartsEnabled()) boardConnection.setEnabled(true);
    boardConnection.disconnect();
    setSoundEnabled(sound);
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { boardConnection, onBoardEvent } from '../src/connection.ts';
import { caller } from '../src/caller/caller.ts';
import { recorder } from '../src/recording.ts';
import { startGame, endGame } from '../src/game/gameStore.ts';
import { dismissEffect } from '../src/effects/effects.ts';
import type { BoardEvent } from '../src/caller/visitTracker.ts';

class Socket {
  static current: Socket;
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_url: string) { Socket.current = this; }
  close() {}
  frame(numbers: number[]) {
    const throws = numbers.map(number => ({ segment: { name: `S${number}`, number, multiplier: 1 } }));
    this.onmessage?.({ data: JSON.stringify({ type: 'state', data: { connected: true, running: true, numThrows: throws.length, throws } }) });
  }
}

test('volné házení před hrou i po ukončení zapisuje události, ale nespustí hlasatele ani efekty', t => {
  const socketDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
  const handle = t.mock.method(caller, 'handle', async () => {});
  const phrase = t.mock.method(caller, 'enqueuePhrase', async () => {});
  const cue = t.mock.method(caller, 'enqueueTurnSound', async () => {});
  t.mock.method(caller, 'enqueuePlayer', async () => {});
  const recording = t.mock.method(recorder, 'meta', () => {});
  const events: BoardEvent[] = [];
  const unsubscribe = onBoardEvent(event => events.push(event));
  try {
    boardConnection.connect('127.0.0.1:3180');
    const freeThrows = () => {
      const socket = Socket.current;
      socket.frame([]); socket.frame([20]); socket.frame([20, 20]); socket.frame([20, 20, 20]);
      socket.frame([]); socket.frame([1]); socket.frame([1, 20]); socket.frame([1, 20, 5]);
      socket.frame([]);
    };
    freeThrows();
    startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, [{ id: 'a', name: 'Radek', color: '#ffffff' }]);
    endGame();
    freeThrows();
    assert.deepEqual(events.filter(event => event.kind === 'visit').map(event => event.total), [60, 26, 60, 26]);
    assert.equal(recording.mock.calls.filter(call => call.arguments[0] === 'visit').length, 4);
    assert.equal(handle.mock.callCount(), 0);
    assert.equal(phrase.mock.callCount(), 0);
    assert.equal(cue.mock.callCount(), 0);
  } finally {
    boardConnection.disconnect(); unsubscribe(); endGame(); dismissEffect(); caller.stop();
    if (socketDescriptor) Object.defineProperty(globalThis, 'WebSocket', socketDescriptor);
    else Reflect.deleteProperty(globalThis, 'WebSocket');
  }
});

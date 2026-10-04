import test from 'node:test';
import assert from 'node:assert/strict';
import { captureMessage } from '../src/autodarts/envelope.ts';

test('zachová celou obálku, raw, směr a milisekundy', () => {
  const raw = ' {"channel":"autodarts.boards","topic":"board.state","data":{"unknown":[1,2]}} ';
  const result = captureMessage(raw, 'in', 9, new Date('2026-10-03T16:41:20.315Z'));
  assert.equal(result.raw, raw);
  assert.equal(result.channel, 'autodarts.boards');
  assert.equal(result.topic, 'board.state');
  assert.equal(result.timestamp, '2026-10-03T16:41:20.315Z');
  assert.equal(result.direction, 'in');
  assert.deepEqual(result.payload, JSON.parse(raw));
});

test('neplatný JSON a libovolné textové rámce se neztrácejí', () => {
  for (const raw of ['{broken', 'ping', '']) {
    const message = captureMessage(raw, 'in', 1);
    assert.equal(message.payload, raw);
    assert.equal(message.format, 'text');
    assert.equal(message.channel, undefined);
  }
});

test('nepředpokládá objekt ani typ kanálu, neodhazuje chyby odběru', () => {
  for (const raw of ['null', '[1,2]', '42', '"text"', '{"channel":42}']) {
    assert.equal(captureMessage(raw, 'in', 1).channel, undefined);
  }
  const message = captureMessage('{"type":"error","message":"denied"}', 'in', 1);
  assert.deepEqual(message.payload, { type: 'error', message: 'denied' });
  assert.equal(message.format, 'json');
});

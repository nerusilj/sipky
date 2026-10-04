import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageStore, filterMessages, toJsonl, MAX_FRAME_CHARS } from '../src/inspector/messageStore.ts';
import { captureMessage } from '../src/autodarts/envelope.ts';

test('kruhový buffer zachová nejnovější zprávy a staré snapshoty', () => {
  const store = new MessageStore(3);
  for (let id = 1; id <= 3; id++) store.append(captureMessage(`${id}`, 'in', id));
  const paused = store.snapshot();
  for (let id = 4; id <= 10; id++) store.append(captureMessage(`${id}`, 'in', id));
  assert.deepEqual(paused.map(m => m.id), [1, 2, 3]);
  assert.deepEqual(store.snapshot().map(m => m.id), [8, 9, 10]);
  assert.equal(store.stats().dropped, 7);
  assert.equal(store.stats().received, 10);
});

test('velikostní limit vyřazuje data i před dosažením počtu zpráv', () => {
  const store = new MessageStore(100, 2100);
  for (let i = 1; i <= 4; i++) store.append(captureMessage('1234', 'in', i));
  assert.equal(store.stats().count, 1);
  assert.ok(store.stats().estimatedBytes <= 2100);
  assert.equal(store.append(captureMessage('x'.repeat(MAX_FRAME_CHARS + 1), 'in', 5)), false);
  assert.equal(store.stats().dropped, 4);
});

test('filtr kombinuje kanál, směr a obsah bez rozlišení velikosti písmen', () => {
  const store = new MessageStore();
  store.append(captureMessage('{"channel":"autodarts.boards","topic":"board.state","data":"ŽLUŤOUČKÝ"}', 'in', 1));
  store.append(captureMessage('{"channel":"autodarts.matches","data":"ŽLUŤOUČKÝ"}', 'out', 2));
  assert.deepEqual(filterMessages(store.snapshot(), 'autodarts.boards', ' žluťoučký ', 'in').map(m=>m.id), [1]);
  assert.equal(filterMessages(store.snapshot(), '', 'BOARD.STATE', '').length, 1);
  assert.equal(filterMessages(store.snapshot(), '', 'absent', '').length, 0);
});

test('JSONL zachová raw včetně newline, neexportuje index a vymaže záznam', () => {
  const store = new MessageStore();
  store.append(captureMessage('{\n"channel":"test","data":1\n}', 'in', 1));
  store.append(captureMessage('malformed\ntext', 'out', 2));
  const lines = toJsonl(store.snapshot()).trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).raw, '{\n"channel":"test","data":1\n}');
  assert.equal(JSON.parse(lines[1]).payload, 'malformed\ntext');
  assert.equal(JSON.parse(lines[0]).searchText, undefined);
  store.clear();
  assert.equal(toJsonl(store.snapshot()), '');
  assert.equal(store.stats().received, 0);
  assert.equal(store.stats().dropped, 0);
});

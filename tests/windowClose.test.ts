import test from 'node:test';
import assert from 'node:assert/strict';
import { WindowCloseGuard } from '../src/windowClose.ts';

test('bez zápasu se okno zavře bez potvrzení; běžící zápas čeká na rozhodnutí', async () => {
  let running = false, prevented = 0, destroyed = 0;
  const prompts: boolean[] = [];
  const guard = new WindowCloseGuard(() => running, open => prompts.push(open), async () => { destroyed++; }, assert.fail);
  const event = { preventDefault: () => { prevented++; } };
  guard.request(event);
  assert.equal(prevented, 0); assert.deepEqual(prompts, []);
  running = true;
  guard.request(event);
  assert.equal(prevented, 1); assert.deepEqual(prompts, [true]); assert.equal(destroyed, 0);
  guard.cancel();
  assert.deepEqual(prompts, [true, false]); assert.equal(destroyed, 0);
  guard.request(event);
  await guard.confirm();
  assert.equal(destroyed, 1);
});

test('opakované potvrzení nezavírá dvakrát; chyba ponechá možnost pokračovat', async () => {
  let finish!: () => void;
  let destroyed = 0;
  const errors: string[] = [];
  const guard = new WindowCloseGuard(() => true, () => {}, () => {
    destroyed++; return new Promise<void>(resolve => { finish = resolve; });
  }, error => errors.push(error));
  const first = guard.confirm();
  await guard.confirm();
  assert.equal(destroyed, 1);
  finish(); await first;
  const failing = new WindowCloseGuard(() => true, () => {}, async () => { throw Error('permission'); }, error => errors.push(error));
  await failing.confirm();
  assert.equal(errors.length, 1);
  let prevented = false;
  failing.request({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
});

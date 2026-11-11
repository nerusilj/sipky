import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
} });
const { createPlayer, changePlayerProfile } = await import('../src/players/players.ts');

test('postupné vytváření hráčů vrací jejich id pro přidání do hry a uloží oba bez duplicit', async () => {
  await nextTurn();
  const first = createPlayer('  Jarda Novák  ');
  const second = createPlayer('Petr');
  assert.ok(first.id);
  assert.notEqual(first.id, second.id);
  assert.equal(first.name, 'Jarda Novák');
  assert.equal(second.name, 'Petr');
  assert.throws(() => createPlayer('jarda novak'), /už existuje/);
  await nextTurn();
  const saved = JSON.parse(data.get('sipky.players')!);
  assert.deepEqual(saved, [first, second]);
});


test('volba iniciál se uloží do profilu a po přejmenování zůstane zachovaná', async () => {
  await nextTurn();
  const player = createPlayer('Karel Novotný', 'initials');
  await nextTurn();
  let saved = JSON.parse(data.get('sipky.players')!);
  assert.equal(saved.find((item: { id: string }) => item.id === player.id).avatarId, 'initials');
  changePlayerProfile(player.id, 'Karel N.');
  await nextTurn();
  saved = JSON.parse(data.get('sipky.players')!);
  const updated = saved.find((item: { id: string }) => item.id === player.id);
  assert.equal(updated.avatarId, 'initials');
  assert.equal(updated.name, 'Karel N.');
});

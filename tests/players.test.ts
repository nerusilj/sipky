import test from 'node:test';
import assert from 'node:assert/strict';
import { addPlayer, initials, MAX_NAME_LENGTH, nameError, nextColor, parsePlayers, PLAYER_COLORS, removePlayer, renamePlayer } from '../src/players/playerList.ts';

const now = new Date('2026-10-04T12:00:00Z');

test('přidání hráče: jméno se očistí, dostane volnou barvu, duplicitu odmítne bez ohledu na velikost a diakritiku', () => {
  let list = addPlayer([], '  Jarda   Novák ', 'a', now);
  assert.deepEqual(list[0], { id: 'a', name: 'Jarda Novák', color: PLAYER_COLORS[0], createdAt: '2026-10-04T12:00:00.000Z' });
  list = addPlayer(list, 'Petr', 'b', now);
  assert.equal(list[1].color, PLAYER_COLORS[1]);
  assert.throws(() => addPlayer(list, 'jarda novák', 'c'), /už existuje/);
  assert.throws(() => addPlayer(list, 'PETR', 'c'), /už existuje/);
  assert.throws(() => addPlayer(list, '   ', 'c'), /Zadejte jméno/);
  assert.throws(() => addPlayer(list, 'x'.repeat(MAX_NAME_LENGTH + 1), 'c'), /nejvýš/);
});

test('přejmenování: vlastní jméno lze jen přepsat velikostí písmen, cizí ne; smazání odebere jen daného hráče', () => {
  let list = addPlayer(addPlayer([], 'Jarda', 'a', now), 'Petr', 'b', now);
  assert.equal(nameError(list, 'JARDA', 'a'), undefined);
  assert.throws(() => renamePlayer(list, 'a', 'petr'), /už existuje/);
  list = renamePlayer(list, 'a', 'Jaroslav');
  assert.deepEqual(list.map(p => p.name), ['Jaroslav', 'Petr']);
  assert.deepEqual(removePlayer(list, 'a').map(p => p.id), ['b']);
});

test('barvy se střídají, iniciály z jména', () => {
  const full = PLAYER_COLORS.map((color, i) => ({ id: String(i), name: `H${i}`, color, createdAt: '' }));
  assert.equal(nextColor(full), PLAYER_COLORS[0]);
  assert.equal(initials('Jarda Novák'), 'JN');
  assert.equal(initials('Miša'), 'MI');
  assert.equal(initials('žofie'), 'ŽO');
});

test('načtení souboru přeskočí neplatné položky a duplicitní id', () => {
  const json = JSON.stringify([
    { id: 'a', name: 'Jarda', color: '#ff7a1f', createdAt: '2026-10-04T12:00:00.000Z' },
    { id: 'a', name: 'Duplikát' }, { id: '', name: 'Bez id' }, { id: 'c', name: '   ' }, null, 'text',
    { id: 'd', name: 'Petr', color: 'red' },
  ]);
  const list = parsePlayers(json);
  assert.deepEqual(list.map(p => p.name), ['Jarda', 'Petr']);
  assert.equal(list[1].color, PLAYER_COLORS[0]);
  assert.deepEqual(parsePlayers('{}'), []);
  assert.deepEqual(parsePlayers('nejson'), []);
});

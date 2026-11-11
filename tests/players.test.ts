import test from 'node:test';
import assert from 'node:assert/strict';
import { addPlayer, initials, MAX_NAME_LENGTH, nameError, nextColor, parsePlayers, PLAYER_COLORS, removePlayer, renamePlayer, updatePlayer } from '../src/players/playerList.ts';

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


test('zvolený avatar přežije uložení, přejmenování i změnu samotného avatara', () => {
  const created = addPlayer([], 'Radek', 'avatar-player', now, 'alien');
  const loaded = parsePlayers(JSON.stringify(created));
  assert.equal(loaded[0].avatarId, 'alien');
  const renamed = updatePlayer(loaded, 'avatar-player', 'Radek N.', 'alien');
  assert.equal(renamed[0].avatarId, 'alien');
  assert.equal(renamed[0].id, created[0].id);
  const changed = updatePlayer(renamed, 'avatar-player', 'Radek N.', 'robot');
  assert.equal(parsePlayers(JSON.stringify(changed))[0].avatarId, 'robot');
  assert.equal(changed[0].createdAt, created[0].createdAt);
  assert.equal(changed[0].name, 'Radek N.');
  assert.equal(updatePlayer(changed, 'avatar-player', 'Radek')[0].avatarId, 'robot');
});

test('staré profily zachovají automatický portrét, neznámý avatar nezahodí hráče', () => {
  const legacy = addPlayer([], 'Petr', 'legacy', now);
  assert.equal(parsePlayers(JSON.stringify(legacy))[0].avatarId, undefined);
  const unknown = parsePlayers(JSON.stringify([{ ...legacy[0], avatarId: '../../unknown.svg' }]));
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].name, 'Petr');
  assert.equal(unknown[0].avatarId, undefined);
  assert.throws(() => updatePlayer(legacy, 'legacy', 'Petr', 'invalid' as never), /Neplatný avatar/);
});


test('vyřazené filmové avatary se načtou jako neutrální bez ztráty profilu', () => {
  const retired = ['harry', 'alf', 'homer', 'bart', 'marge'];
  const list = parsePlayers(JSON.stringify(retired.map((avatarId, i) => ({
    id: String(i), name: `Hráč ${i}`, color: PLAYER_COLORS[i], createdAt: now.toISOString(), avatarId,
  }))));
  assert.equal(list.length, retired.length);
  list.forEach((player, i) => {
    assert.equal(player.avatarId, 'neutral');
    assert.equal(player.id, String(i));
    assert.equal(player.color, PLAYER_COLORS[i]);
    assert.equal(player.createdAt, now.toISOString());
  });
});


test('iniciály lze zvolit místo avatara, uložit a přepnout zpět na obrázek', () => {
  const created = addPlayer([], 'Radek Novák', 'initial-player', now, 'initials');
  const loaded = parsePlayers(JSON.stringify(created));
  assert.equal(loaded[0].avatarId, 'initials');
  assert.equal(initials(loaded[0].name), 'RN');
  const renamed = renamePlayer(loaded, 'initial-player', 'Petr Žák');
  assert.equal(renamed[0].avatarId, 'initials');
  assert.equal(initials(renamed[0].name), 'PŽ');
  const portrait = updatePlayer(renamed, 'initial-player', 'Petr Žák', 'robot');
  assert.equal(parsePlayers(JSON.stringify(portrait))[0].avatarId, 'robot');
  const back = updatePlayer(portrait, 'initial-player', 'Žofie', 'initials');
  assert.equal(parsePlayers(JSON.stringify(back))[0].avatarId, 'initials');
  assert.equal(initials(back[0].name), 'ŽO');
  assert.equal(back[0].id, created[0].id);
  assert.equal(back[0].createdAt, created[0].createdAt);
});

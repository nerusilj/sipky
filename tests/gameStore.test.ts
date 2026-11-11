import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { createGame, makeDart } from '../src/game/x01.ts';

const storage = new Map<string, string>([['sipky.effectsEnabled', 'false']]);
storage.set('sipky.currentGame', JSON.stringify({ version: 1, boardPhase: 'ready', game: createGame(
  { startScore: 301, doubleOut: true, legsToWin: 1 }, [{ id: 'old', name: 'Starý hráč', color: '#ffffff' }]) }));
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });
class AudioStub {
  static instances: AudioStub[] = [];
  static all: AudioStub[] = [];
  static holdCue?: 'bust';
  onended?: () => void; onpause?: () => void; onerror?: () => void;
  ended = false;
  paused = false;
  readonly url: string;
  constructor(url: string) {
    this.url = url;
    // Úvodní hlášku ověřují samostatně gameStart.test.ts; zde se sleduje průběh kol.
    if (!url.endsWith('/fun/gameon.wav')) AudioStub.all.push(this);
    if (!url.startsWith('/sounds/game/') && !url.endsWith('/fun/gameon.wav')) AudioStub.instances.push(this);
  }
  play() {
    if (this.url.startsWith('/sounds/game/') || this.url.endsWith('/fun/gameon.wav')) {
      const held = AudioStub.holdCue;
      if (!held || !this.url.includes(held)) queueMicrotask(() => this.finish());
    }
    return Promise.resolve();
  }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.onended?.(); }
}
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioStub });
const store = await import('../src/game/gameStore.ts');
const players = [{ id: 'a', name: 'Jarda', color: '#ff7a1f' }, { id: 'b', name: 'Petr', color: '#40e0c8' }];
test('sdílená aplikace neobnoví starou hru a nové hody neukládá mezi spuštěními', () => {
  assert.equal(store.hasGame(), false);
  assert.equal(storage.has('sipky.currentGame'), false);
  assert.equal(storage.get('sipky.effectsEnabled'), 'false');
  store.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players);
  store.throwDart(makeDart(20, 1));
  assert.equal(store.isGameRunning(), true);
  assert.equal(storage.has('sipky.currentGame'), false);
  store.endGame();
  assert.equal(store.hasGame(), false);
});
const start = () => { AudioStub.instances.length = 0; AudioStub.all.length = 0; AudioStub.holdCue = undefined;
  store.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, players); };
const S = (n: number) => makeDart(n, 1);
const board = (...numbers: number[]) => ({ type: 'state', data: { connected: true, running: true,
  event: numbers.length ? 'Throw detected' : 'Takeout finished', status: 'Throw', numThrows: numbers.length,
  throws: numbers.map(n => ({ segment: S(n) })) } });

test('ruční třetí šipka ohlásí skóre, ale hráč čeká na tlačítko Další', async () => {
  start();
  try {
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    assert.equal(store.getGameSnapshot().game?.current.length, 3);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(AudioStub.instances.length, 0);
    assert.equal(storage.has('sipky.currentGame'), false);
    store.enterDart(S(20));
    assert.equal(store.getGameSnapshot().game?.current.length, 3);
    await wait(550); assert.equal(AudioStub.instances.length, 1);
    await wait(500); assert.equal(store.getGameSnapshot().state?.current, 0);
    AudioStub.instances[0].finish(); await wait(400);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(store.getGameSnapshot().state?.history.length, 0);
    store.nextPlayer();
    assert.equal(store.getGameSnapshot().completing, 'showing');
    await wait(1100);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.getGameSnapshot().state?.history[0].scored, 39);
    assert.equal(store.getGameSnapshot().game?.current.length, 0);
  } finally { store.endGame(); }
});

test('autodarts: během hlášení uchová zprávy pro dalšího hráče a nezapíše reset podruhé', async () => {
  start();
  try {
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board(12, 13, 14));
    assert.equal(store.getGameSnapshot().completing, undefined);
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board(20));
    assert.equal(store.getGameSnapshot().game?.current.length, 3);
    await wait(550); AudioStub.instances[0].finish(); await wait(550);
    const { game, state } = store.getGameSnapshot();
    assert.equal(state?.current, 1); assert.equal(state?.history.length, 1);
    assert.equal(game?.current[0].score, 20);
  } finally { store.endGame(); }
});

test('Zpět během hlášení zruší pozdější přepnutí hráče', async () => {
  start();
  try {
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    await wait(550); store.undoDart(); await wait(600);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(store.getGameSnapshot().game?.current.length, 2);
    assert.equal(store.getGameSnapshot().completing, undefined);
    assert.equal(store.getGameSnapshot().state?.history.length, 0);
  } finally { store.endGame(); }
});

test('vypnutí zvuku během hlášení nezablokuje přechod na dalšího hráče', async () => {
  const { setSoundEnabled } = await import('../src/settings.ts');
  start();
  try {
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    store.nextPlayer();
    await wait(550);
    assert.equal(AudioStub.instances.length, 1);
    setSoundEnabled(false);
    await wait(600);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.getGameSnapshot().state?.history[0].scored, 39);
    assert.equal(store.getGameSnapshot().completing, undefined);
  } finally { store.endGame(); setSoundEnabled(true); }
});

test('jméno zazní při startu a po skóre, Zpět zastaví hlášení hráče, který už není na řadě', async () => {
  const { playerSpeech } = await import('../src/caller/playerSpeech.ts');
  const original = playerSpeech.prepare;
  playerSpeech.prepare = async name => `blob:${name}`;
  start();
  try {
    await wait(0);
    assert.equal(AudioStub.instances[0].url, 'blob:Jarda');
    AudioStub.instances[0].finish();
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    await wait(550);
    assert.match(AudioStub.instances[1].url, /score\/39\.wav$/);
    assert.equal(AudioStub.instances.length, 2);
    store.nextPlayer();
    AudioStub.instances[1].finish();
    await wait(1100);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(AudioStub.instances[2].url, 'blob:Petr');
    store.undoDart();
    assert.equal(AudioStub.instances[2].paused, true);
    assert.equal(store.getGameSnapshot().state?.current, 0);
  } finally { store.endGame(); playerSpeech.prepare = original; }
});

test('opožděné generování jména nepřehraje hlášku během hodů ani po ukončení hry', async () => {
  const { playerSpeech } = await import('../src/caller/playerSpeech.ts');
  const original = playerSpeech.prepare;
  let resolve!: (url: string) => void;
  const delayed = new Promise<string>(done => { resolve = done; });
  playerSpeech.prepare = () => delayed;
  start();
  try {
    store.enterDart(S(20));
    store.endGame();
    resolve('blob:stare-jmeno');
    await wait(0);
    assert.equal(AudioStub.instances.length, 0);
  } finally { store.endGame(); playerSpeech.prepare = original; }
});

test('po vítězném zavření zápasu se další hráč neohlásí', async () => {
  const { playerSpeech } = await import('../src/caller/playerSpeech.ts');
  const original = playerSpeech.prepare;
  playerSpeech.prepare = async name => `blob:${name}`;
  AudioStub.instances.length = 0;
  store.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, [players[0]]);
  try {
    await wait(0); AudioStub.instances[0].finish();
    [0, 1, 2].forEach(() => store.enterDart(makeDart(20, 3)));
    store.nextPlayer();
    await wait(550); AudioStub.instances[1].finish(); await wait(550);
    assert.equal(AudioStub.instances[2].url, 'blob:Jarda');
    AudioStub.instances[2].finish();
    [makeDart(20, 3), makeDart(19, 3), makeDart(2, 2)].forEach(store.enterDart);
    store.nextPlayer();
    await wait(550);
    assert.match(AudioStub.instances[3].url, /score\/121\.wav$/);
    AudioStub.instances[3].finish(); await wait(550);
    assert.equal(store.getGameSnapshot().state?.winner, 0);
    assert.equal(AudioStub.instances.length, 4);
  } finally { store.endGame(); playerSpeech.prepare = original; }
});

test('klávesnice: skóre a jméno bez pípnutí, přepnutí čeká na doznění skóre', async () => {
  const { playerSpeech } = await import('../src/caller/playerSpeech.ts');
  const original = playerSpeech.prepare;
  playerSpeech.prepare = async name => `blob:${name}`;
  start();
  try {
    await wait(0); AudioStub.instances[0].finish();
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    store.nextPlayer();
    await wait(550);
    assert.match(AudioStub.instances[1].url, /score\/39\.wav$/);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(AudioStub.instances.length, 2);
    AudioStub.instances[1].finish(); await wait(700);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.deepEqual(AudioStub.all.map(audio => audio.url), ['blob:Jarda', '/sounds/cs/eliska/score/39.wav', 'blob:Petr']);
  } finally { store.endGame(); playerSpeech.prepare = original; AudioStub.holdCue = undefined; }
});

test('terč: skóre před vytažením a jméno po prázdném terči, bez pípnutí v obou krocích', async () => {
  const { playerSpeech } = await import('../src/caller/playerSpeech.ts');
  const original = playerSpeech.prepare;
  playerSpeech.prepare = async name => `blob:${name}`;
  start();
  try {
    await wait(0); AudioStub.instances[0].finish();
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board(12, 13, 14));
    store.feedGameFromBoard(board(12, 13, 14));
    await wait(550);
    assert.match(AudioStub.instances[1].url, /score\/39\.wav$/);
    assert.equal(store.getGameSnapshot().state?.history.length, 0);
    AudioStub.instances[1].finish(); await wait(250);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(AudioStub.all.some(audio => audio.url.startsWith('/sounds/game/')), false);
    const takingOut = board(12, 13);
    takingOut.data.event = 'Takeout started';
    store.feedGameFromBoard(takingOut);
    assert.equal(store.getGameSnapshot().game?.current.length, 3);
    store.feedGameFromBoard(board());
    await wait(1100);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(AudioStub.instances.at(-1)?.url, 'blob:Petr');
    assert.equal(AudioStub.instances.filter(audio => audio.url.includes('/score/')).length, 1);
    assert.equal(AudioStub.all.some(audio => audio.url.startsWith('/sounds/game/')), false);
  } finally { store.endGame(); playerSpeech.prepare = original; AudioStub.holdCue = undefined; }
});

test('oprava třetí šipky před hlášením zruší původní součet', async () => {
  start();
  try {
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board(12, 13, 14));
    await wait(100);
    store.feedGameFromBoard(board(12, 13, 20));
    await wait(550);
    assert.equal(AudioStub.instances.length, 1);
    assert.match(AudioStub.instances[0].url, /score\/45\.wav$/);
    assert.equal(store.getGameSnapshot().state?.history.length, 0);
  } finally { store.endGame(); }
});

test('oprava první šipky zachová další dvě, přepočítá skóre a před Další nepřepne hráče', async () => {
  start();
  try {
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    store.replaceCurrentDart(0, makeDart(20, 3));
    assert.deepEqual(store.getGameSnapshot().game?.current.map(d => d.score), [60, 13, 14]);
    assert.equal(store.getGameSnapshot().state?.visitResult.scored, 87);
    assert.equal(store.getGameSnapshot().state?.visitResult.remaining, 214);
    store.replaceCurrentDart(3, S(1));
    await wait(550);
    assert.equal(AudioStub.instances.length, 1);
    assert.match(AudioStub.instances[0].url, /score\/87\.wav$/);
    AudioStub.instances[0].finish(); await wait(600);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    assert.equal(store.getGameSnapshot().state?.history.length, 0);
  } finally { store.endGame(); }
});

test('oprava první šipky během hlášení zastaví původní součet a ohlásí nový', async () => {
  start();
  try {
    [12, 13, 14].forEach(n => store.enterDart(S(n)));
    await wait(550);
    assert.match(AudioStub.instances[0].url, /score\/39\.wav$/);
    store.replaceCurrentDart(0, S(20));
    assert.equal(AudioStub.instances[0].paused, true);
    await wait(550);
    assert.match(AudioStub.instances[1].url, /score\/47\.wav$/);
    assert.equal(store.getGameSnapshot().state?.current, 0);
  } finally { store.endGame(); }
});

test('ruční oprava šipky z Autodarts přežije snapshoty a hráč se přepne až po vytažení', async () => {
  start();
  try {
    store.feedGameFromBoard(board());
    store.feedGameFromBoard(board(12, 13));
    store.replaceCurrentDart(0, S(20));
    store.feedGameFromBoard(board(12, 13, 14));
    assert.deepEqual(store.getGameSnapshot().game?.current.map(d => d.score), [20, 13, 14]);
    assert.equal(store.getGameSnapshot().boardPhase, 'takeout');
    await wait(550);
    assert.match(AudioStub.instances[0].url, /score\/47\.wav$/);
    AudioStub.instances[0].finish(); await wait(250);
    assert.equal(store.getGameSnapshot().state?.current, 0);
    store.feedGameFromBoard(board());
    await wait(1100);
    assert.equal(store.getGameSnapshot().state?.current, 1);
    assert.equal(store.getGameSnapshot().state?.history[0].scored, 47);
    assert.equal(AudioStub.instances.length, 1);
  } finally { store.endGame(); }
});

async function prepareBustVisit() {
  start();
  store.startGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, [players[0]]);
  [20, 20, 20].forEach(n => store.enterDart(makeDart(n, 3)));
  await wait(550);
  assert.match(AudioStub.instances.at(-1)!.url, /score\/180\.wav$/);
  AudioStub.instances.at(-1)!.finish();
  store.nextPlayer();
  await wait(1100);
  assert.equal(store.getGameSnapshot().state?.remaining[0], 121);
  AudioStub.instances.length = 0; AudioStub.all.length = 0;
}

test('MIMO má tlumený efekt ručně i z terče, opakovaný snapshot ho nepřehraje znovu', async () => {
  start();
  try {
    store.enterDart(makeDart(0, 0));
    await wait(20);
    assert.deepEqual(AudioStub.all.map(a => a.url), ['/sounds/game/miss.wav']);
    store.enterDart(S(1));
    assert.equal(AudioStub.all.length, 1);
    start();
    store.feedGameFromBoard(board());
    const frame = board(0);
    frame.data.throws = [{ segment: makeDart(0, 0) }];
    store.feedGameFromBoard(frame);
    store.feedGameFromBoard(frame);
    await wait(20);
    assert.deepEqual(AudioStub.all.map(a => a.url), ['/sounds/game/miss.wav']);
  } finally { store.endGame(); }
});

test('přehoz má pouze tlumený zvuk bez hlasu a nuly; ruční kolo čeká na Další', async () => {
  await prepareBustVisit();
  try {
    AudioStub.holdCue = 'bust';
    [makeDart(20, 3), S(20), makeDart(20, 3)].forEach(store.enterDart);
    await wait(550);
    assert.deepEqual(AudioStub.all.map(a => a.url), ['/sounds/game/bust.wav']);
    assert.equal(AudioStub.instances.length, 0);
    AudioStub.all[0].finish(); await wait(70);
    assert.equal(AudioStub.all.length, 1, 'po zvuku se žádná hláška nepřidá');
    assert.equal(store.getGameSnapshot().state?.history.length, 1);
    assert.equal(store.getGameSnapshot().state?.visitResult.bust, true);
    store.nextPlayer(); await wait(1100);
    assert.equal(store.getGameSnapshot().state?.history.length, 2);
    assert.equal(store.getGameSnapshot().state?.history[1].scored, 0);
    assert.equal(store.getGameSnapshot().state?.remaining[0], 121);
    assert.equal(AudioStub.instances.length, 0);
  } finally { store.endGame(); }
});

test('oprava přehozu přeruší zvuk a ohlásí opravený součet; návrat k přehozu znovu jen zvuk', async () => {
  await prepareBustVisit();
  try {
    AudioStub.holdCue = 'bust';
    [makeDart(20, 3), S(20), makeDart(20, 3)].forEach(store.enterDart);
    await wait(550);
    const cue = AudioStub.all[0];
    store.replaceCurrentDart(0, S(1));
    assert.equal(cue.paused, true);
    await wait(550);
    assert.match(AudioStub.instances[0]?.url, /score\/81\.wav$/);
    store.replaceCurrentDart(0, makeDart(20, 3));
    await wait(550);
    const secondCue = AudioStub.all.at(-1)!;
    assert.equal(secondCue.url, '/sounds/game/bust.wav');
    assert.equal(AudioStub.instances.length, 1, 'zůstalo jen předchozí hlášení 81');
    store.replaceCurrentDart(0, S(2));
    assert.equal(secondCue.paused, true);
    await wait(550);
    assert.match(AudioStub.instances.at(-1)?.url ?? '', /score\/82\.wav$/);
    assert.equal(store.getGameSnapshot().state?.visitResult.bust, false);
    assert.equal(AudioStub.all.some(a => /fun\/bust\.wav$|score\/0\.wav$/.test(a.url)), false);
  } finally { store.endGame(); }
});

test('přehoz z Autodarts má jeden zvuk bez hlasu a čeká na vytažení i doznění', async () => {
  await prepareBustVisit();
  try {
    AudioStub.holdCue = 'bust';
    store.feedGameFromBoard(board());
    const frame = board(20, 20, 20);
    frame.data.throws = [makeDart(20, 3), S(20), makeDart(20, 3)].map(segment => ({ segment }));
    store.feedGameFromBoard(frame);
    await wait(550);
    assert.deepEqual(AudioStub.all.map(a => a.url), ['/sounds/game/bust.wav']);
    store.feedGameFromBoard(frame);
    store.feedGameFromBoard(board());
    assert.equal(store.getGameSnapshot().state?.history.length, 1);
    AudioStub.all[0].finish(); await wait(1100);
    store.feedGameFromBoard(board());
    assert.equal(store.getGameSnapshot().state?.history.length, 2);
    assert.equal(AudioStub.instances.length, 0);
    assert.equal(AudioStub.all.length, 1);
  } finally { store.endGame(); }
});

test('ruční zavření automaticky připíše leg a poslední leg vyhlásí vítěze bez Další', async () => {
  const { setSoundEnabled } = await import('../src/settings.ts');
  setSoundEnabled(false);
  store.startGame({ startScore: 101, doubleOut: true, legsToWin: 2 }, [players[0]]);
  try {
    for (let leg = 1; leg <= 2; leg++) {
      [S(1), makeDart(20, 3), makeDart(20, 2)].forEach(store.enterDart);
      assert.equal(store.getGameSnapshot().state?.visitResult.remaining, 0);
      assert.equal(store.getGameSnapshot().state?.legsWon[0], leg - 1);
      await wait(1150);
      assert.equal(store.getGameSnapshot().state?.legsWon[0], leg);
      if (leg === 1) {
        assert.equal(store.getGameSnapshot().state?.leg, 2);
        assert.equal(store.getGameSnapshot().state?.winner, undefined);
        assert.equal(store.getGameSnapshot().state?.remaining[0], 101);
      } else {
        assert.equal(store.getGameSnapshot().state?.winner, 0);
        assert.equal(store.isGameRunning(), false);
      }
    }
  } finally { store.endGame(); setSoundEnabled(true); }
});

test('Autodarts: šipka po přehozu nerozšíří vyhodnocené kolo ani nezopakuje BUST; oprava zůstane funkční', async () => {
  await prepareBustVisit();
  try {
    AudioStub.holdCue = 'bust';
    store.feedGameFromBoard(board());
    const frame = board(20, 20);
    frame.data.throws = [makeDart(20, 3), makeDart(20, 3)].map(segment => ({ segment }));
    store.feedGameFromBoard(frame);
    await wait(550);
    const cue = AudioStub.all[0];
    assert.equal(cue?.url, '/sounds/game/bust.wav');
    const extra = board(20, 20, 0);
    extra.data.throws = [makeDart(20, 3), makeDart(20, 3), makeDart(0, 0)].map(segment => ({ segment }));
    store.feedGameFromBoard(extra);
    store.feedGameFromBoard(extra);
    assert.deepEqual(store.getGameSnapshot().state?.visit.map(d => d.name), ['T20', 'T20']);
    assert.equal(store.getGameSnapshot().state?.visitResult.bust, true);
    assert.equal(cue.paused, false);
    await wait(550);
    assert.equal(AudioStub.instances.length, 0);
    assert.equal(AudioStub.all.filter(a => a.url === '/sounds/game/bust.wav').length, 1);
    assert.equal(AudioStub.all.some(a => a.url === '/sounds/game/miss.wav'), false);
    // Oprava skutečně platné šipky zruší přehoz a přepočítá rozpoznané kolo.
    store.replaceCurrentDart(0, S(1));
    assert.equal(cue.paused, true);
    assert.equal(store.getGameSnapshot().state?.visitResult.bust, false);
    await wait(550);
    assert.match(AudioStub.instances.at(-1)?.url ?? '', /score\/61\.wav$/);
  } finally { store.endGame(); }
});

import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import * as x01 from '../src/game/gameStore.ts';
import * as cricket from '../src/game/cricketStore.ts';
import { onCelebrate } from '../src/effects/confetti.ts';
import { setConfettiEnabled, setEffectsEnabled, setSoundEnabled } from '../src/settings.ts';
import { makeDart, playerDisplayedLegsWon, playerFinishPlace } from '../src/game/x01.ts';
import type { Dart } from '../src/game/x01.ts';
import { caller } from '../src/caller/caller.ts';

const players = ['Radek', 'Olik', 'Franta'].map((name, index) => ({ id: String(index), name, color: '#ffffff' }));
const S = (number: number) => makeDart(number, 1), T = (number: number) => makeDart(number, 3), D = (number: number) => makeDart(number, 2);
const frame = (darts: Dart[]) => ({ type: 'state', data: { connected: true, running: true, numThrows: darts.length, throws: darts.map(segment => ({ segment })) } });
async function finishTimers(t: TestContext) {
  for (let i = 0; i < 4; i++) { t.mock.timers.tick(1000); await turn(); }
}
function begin() { setSoundEnabled(false); setEffectsEnabled(true); setConfettiEnabled(true); x01.endGame(); cricket.endCricket(); x01.feedGameFromBoard(frame([])); }
function end() { x01.endGame(); cricket.endCricket(); caller.stop(); setConfettiEnabled(true); setEffectsEnabled(true); }

test('každý hráč dostane konfety i medaili hned po zavírací šipce, potvrzení oslavu neopakuje', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    x01.startGame({ startScore: 101, doubleOut: true, legsToWin: 1, minFinishers: 2 }, players);
    for (let player = 0; player < 2; player++) {
      [S(1), T(20), D(20)].forEach(x01.enterDart);
      const live = x01.getGameSnapshot().state!;
      assert.equal(live.visitResult.checkout, true);
      assert.equal(celebrations, player + 1, 'oslava nečeká na časovač ani potvrzení');
      assert.equal(playerFinishPlace(live, player), player + 1);
      assert.equal(live.finished.includes(player), false, 'zavření ještě není potvrzeno');
      await finishTimers(t);
      assert.equal(celebrations, player + 1);
      if (player === 0) {
        assert.deepEqual(x01.getGameSnapshot().state?.legsWon, [0, 0, 0]);
        assert.equal(x01.getGameSnapshot().state?.winner, undefined);
      }
    }
    assert.equal(x01.getGameSnapshot().state?.winner, 0);
    await finishTimers(t); assert.equal(celebrations, 2);
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

test('terč: okamžitá medaile se opraví s hodem, snapshoty a vytažení neopakují konfety', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    x01.startGame({ startScore: 101, doubleOut: true, legsToWin: 1, minFinishers: 2 }, players);
    const closed = frame([S(1), T(20), D(20)]);
    x01.feedGameFromBoard(closed); x01.feedGameFromBoard(closed);
    assert.equal(celebrations, 1);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 0), 1);
    assert.equal(playerDisplayedLegsWon(x01.getGameSnapshot().state!, 0), 1, 'leg je vidět už se zlatou medailí');
    await finishTimers(t);
    assert.equal(x01.getGameSnapshot().state?.current, 0);
    assert.deepEqual(x01.getGameSnapshot().state?.finished, []);
    assert.deepEqual(x01.getGameSnapshot().state?.legsWon, [0, 0, 0]);
    assert.equal(celebrations, 1);

    x01.feedGameFromBoard(frame([S(1), T(20), S(20)]));
    assert.equal(x01.getGameSnapshot().state?.visitResult.checkout, false);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 0), undefined);
    assert.equal(playerDisplayedLegsWon(x01.getGameSnapshot().state!, 0), 0);
    await finishTimers(t); assert.equal(celebrations, 1);
    x01.feedGameFromBoard(closed);
    assert.equal(celebrations, 2, 'opravená zavírací šipka znovu platí');
    x01.feedGameFromBoard(frame([])); await finishTimers(t);
    assert.equal(x01.getGameSnapshot().state?.current, 1);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 0), 1);
    assert.equal(playerDisplayedLegsWon(x01.getGameSnapshot().state!, 0), 1, 'vítěz má leg i při dohrávání ostatních');
    assert.equal(celebrations, 2);

    x01.feedGameFromBoard(closed); x01.feedGameFromBoard(closed);
    assert.equal(celebrations, 3);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 0), 1);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 1), 2);
    assert.equal(playerDisplayedLegsWon(x01.getGameSnapshot().state!, 1), 0);
    assert.equal(x01.getGameSnapshot().state?.winner, undefined);
    await finishTimers(t); assert.equal(celebrations, 3);
    assert.equal(x01.getGameSnapshot().state?.current, 1);
    x01.feedGameFromBoard(frame([])); await finishTimers(t);
    assert.equal(x01.getGameSnapshot().state?.winner, 0);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 1), 2);
    assert.equal(playerDisplayedLegsWon(x01.getGameSnapshot().state!, 0), 1, 'po dohrání se leg nepřičte podruhé');
    assert.equal(celebrations, 3);
    x01.feedGameFromBoard(frame([])); x01.feedGameFromBoard(closed); await finishTimers(t);
    assert.equal(celebrations, 3);
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

test('BUST na nule a vítězství v rozhozu bez zavření nespustí konfety', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    x01.startGame({ startScore: 101, doubleOut: true, legsToWin: 1 }, [players[0]]);
    [T(17), S(20), T(10)].forEach(x01.enterDart); // 101, ale bez posledního doublu
    assert.equal(x01.getGameSnapshot().state?.visitResult.bust, true);
    assert.equal(playerFinishPlace(x01.getGameSnapshot().state!, 0), undefined);
    x01.nextPlayer(); await finishTimers(t); assert.equal(celebrations, 0);
    x01.endGame();
    x01.startGame({ startScore: 101, doubleOut: true, legsToWin: 1, maxRounds: 1 }, players.slice(0, 2));
    for (let player = 0; player < 2; player++) { x01.enterDart(S(1)); x01.nextPlayer(); await finishTimers(t); }
    assert.ok(x01.getGameSnapshot().state?.bullOff);
    x01.decideBullOffWinner(0);
    assert.equal(x01.getGameSnapshot().state?.winner, 0);
    assert.equal(celebrations, 0);
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

test('vypínač konfet i hlavní vypínač efektů zabrání oslavě zavření', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    for (const disable of [() => setConfettiEnabled(false), () => setEffectsEnabled(false)]) {
      setConfettiEnabled(true); setEffectsEnabled(true); disable();
      x01.startGame({ startScore: 101, doubleOut: true, legsToWin: 1 }, [players[0]]);
      [S(1), T(20), D(20)].forEach(x01.enterDart); await finishTimers(t);
      assert.equal(x01.getGameSnapshot().state?.winner, 0); assert.equal(celebrations, 0);
      x01.endGame();
    }
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

test('Cricket má při dokončení legu i zápasu stejnou jedinou oslavu', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    cricket.startCricket({ legsToWin: 2 }, [players[0]]);
    for (let leg = 1; leg <= 2; leg++) {
      for (const darts of [[T(20), T(19), T(18)], [T(17), T(16), T(15)], [D(25), S(25)]]) {
        darts.forEach(cricket.enterCricketDart);
        if (cricket.getCricketSnapshot().state?.visitResult.checkout) assert.equal(celebrations, leg, 'Cricket také slaví před potvrzením');
        cricket.nextCricketPlayer(); await finishTimers(t);
      }
      assert.equal(celebrations, leg);
      assert.equal(cricket.getCricketSnapshot().state?.legsWon[0], leg);
    }
    assert.equal(cricket.getCricketSnapshot().state?.winner, 0);
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

test('Cricket z terče slaví už při posledním zásahu a s přechodem na další leg čeká na vytažení', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); begin();
  let celebrations = 0; const unsubscribe = onCelebrate(() => { celebrations++; });
  try {
    cricket.feedCricketFromBoard(frame([]));
    cricket.startCricket({ legsToWin: 2 }, [players[0]]);
    for (const darts of [[T(20), T(19), T(18)], [T(17), T(16), T(15)]]) {
      cricket.feedCricketFromBoard(frame(darts)); cricket.feedCricketFromBoard(frame([])); await finishTimers(t);
    }
    cricket.feedCricketFromBoard(frame([D(25)])); assert.equal(celebrations, 0);
    const closed = frame([D(25), S(25)]);
    cricket.feedCricketFromBoard(closed); cricket.feedCricketFromBoard(closed);
    assert.equal(celebrations, 1);
    await finishTimers(t);
    assert.equal(cricket.getCricketSnapshot().state?.leg, 1);
    assert.deepEqual(cricket.getCricketSnapshot().state?.legsWon, [0]);
    assert.equal(celebrations, 1);
    cricket.feedCricketFromBoard(frame([])); await finishTimers(t);
    assert.equal(cricket.getCricketSnapshot().state?.leg, 2);
    assert.deepEqual(cricket.getCricketSnapshot().state?.legsWon, [1]);
    assert.equal(celebrations, 1);
  } finally { unsubscribe(); end(); t.mock.timers.reset(); }
});

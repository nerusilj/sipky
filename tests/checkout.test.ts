import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestCheckout, suggestCheckoutSetup } from '../src/game/checkout.ts';
import { commitVisit, createGame, dartLabel, deriveState, makeDart, setVisit, undo } from '../src/game/x01.ts';
import { x01Display } from '../src/cast/protocol.ts';

const names = (score: number, darts = 3) => suggestCheckout(score, darts)?.map(dartLabel).join(' ');

test('příprava se zobrazí jen když lze zbývajícími šipkami nechat zavíratelný zbytek', () => {
  const setup = suggestCheckoutSetup(189, 1);
  assert.deepEqual(setup, { route: [makeDart(19, 1)], leave: 170 });
  assert.deepEqual(suggestCheckoutSetup(350, 3), { route: Array(3).fill(makeDart(20, 3)), leave: 170 });
  assert.equal(suggestCheckoutSetup(351, 3), undefined);
  assert.equal(suggestCheckoutSetup(231, 1), undefined);
  assert.equal(suggestCheckoutSetup(189, 0), undefined);
  assert.equal(suggestCheckoutSetup(170, 3), undefined);
  assert.ok(names(suggestCheckoutSetup(169, 3)!.leave));
  assert.equal(suggestCheckoutSetup(92, 1, 16)?.leave, 32);
});

test('žlutá příprava navazuje na zelený dohoz a vypnutí platí i pro TV', () => {
  const initial = createGame({ startScore: 101, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'Jana', color: '#ff7a1f', preferredDouble: 20 },
  ]);
  const game = { ...initial, visits: [[makeDart(1, 1)]] };
  const score = (current: ReturnType<typeof makeDart>[]) => x01Display(deriveState({ ...game, current }), false).players[0];
  assert.ok(score([]).checkout); // 100, tři šipky
  assert.equal(score([]).checkoutSetup, undefined);
  assert.ok(score([makeDart(20, 1)]).checkout); // 80, dvě šipky
  assert.equal(score([makeDart(20, 1)]).checkoutSetup, undefined);
  const state = deriveState({ ...game, current: [makeDart(20, 1), makeDart(20, 1)] });
  const yellow = x01Display(state, false).players[0];
  assert.equal(yellow.checkout, undefined); // 60, jedna šipka
  assert.equal(yellow.checkoutSetup?.leave, 40); // zachová oblíbený D20
  const withoutSetup = { ...game, settings: { ...game.settings, checkoutSetupEnabled: false } };
  assert.equal(x01Display(deriveState({ ...withoutSetup, current: state.visit }), false).players[0].checkoutSetup, undefined);
  const finish = deriveState({ ...withoutSetup, current: [makeDart(20, 1)] });
  assert.ok(x01Display(finish, false).players[0].checkout);
  assert.equal(x01Display(finish, false).players[0].checkoutSetup, undefined);
});

test('příprava nepředběhne dohoz ani u vysokého skóre nebo nezavíratelného zbytku', () => {
  const game = createGame({ startScore: 301, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'Jana', color: '#ff7a1f' },
  ]);
  for (const current of [[], [makeDart(20, 3)], [makeDart(20, 3), makeDart(18, 3)]]) {
    const score = x01Display(deriveState({ ...game, current }), false).players[0];
    assert.equal(score.checkout, undefined);
    assert.equal(score.checkoutSetup, undefined);
  }
  const at350 = deriveState({ ...game, settings: { ...game.settings, startScore: 401 }, visits: [[makeDart(17, 3)]] });
  assert.equal(x01Display(at350, false).players[0].checkoutSetup, undefined);
  const at169 = deriveState({ ...game, visits: [[makeDart(20, 3), makeDart(20, 3), makeDart(12, 1)]] });
  assert.equal(x01Display(at169, false).players[0].checkout, undefined);
  assert.equal(x01Display(at169, false).players[0].checkoutSetup, undefined);
});

test('příprava zmizí po třetí šipce, přehozu i zavření', () => {
  const game = createGame({ startScore: 201, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'Jana', color: '#ff7a1f' },
  ]);
  const at60 = { ...game, visits: [[makeDart(20, 3), makeDart(20, 3), makeDart(7, 3)]] };
  for (const current of [
    [makeDart(0, 0), makeDart(0, 0), makeDart(0, 0)],
    [makeDart(19, 3), makeDart(20, 3)], // přehoz
    [makeDart(20, 1), makeDart(20, 2)], // zavření
  ]) {
    const score = x01Display(deriveState({ ...at60, current }), false).players[0];
    assert.equal(score.checkout, undefined);
    assert.equal(score.checkoutSetup, undefined);
  }
});

test('opravy, Zpět a nové kolo přepočtou podmínku předchozího dohozu', () => {
  const game = createGame({ startScore: 201, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'Jana', color: '#ff7a1f' },
  ]);
  const at100 = { ...game, visits: [[makeDart(20, 3), makeDart(13, 3), makeDart(2, 1)]] };
  const yellow = setVisit(at100, [makeDart(20, 1), makeDart(20, 1)]);
  const display = (value: typeof game) => x01Display(deriveState(value), false).players[0];
  assert.ok(display(yellow).checkoutSetup);
  assert.ok(display(undo(yellow)).checkout);
  assert.equal(display(undo(yellow)).checkoutSetup, undefined);
  const corrected = setVisit(yellow, [makeDart(20, 1), makeDart(20, 3)]);
  assert.ok(display(corrected).checkout); // oprava druhé šipky nechá D10
  assert.equal(display(corrected).checkoutSetup, undefined);
  assert.ok(display(setVisit(corrected, yellow.current)).checkoutSetup);
  const at170 = { ...game, visits: [[makeDart(20, 1), makeDart(11, 1)]] };
  const missed = setVisit(at170, [makeDart(1, 1)]);
  assert.ok(display(missed).checkoutSetup);
  assert.equal(display(commitVisit(missed)).checkout, undefined); // další kolo začíná na 169
  assert.equal(display(commitVisit(missed)).checkoutSetup, undefined);
});

test('oblíbený double změní dopočet bez prodlužování běžné cesty', () => {
  const preferred = (score: number, darts: number, double: number) => suggestCheckout(score, darts, double)?.map(dartLabel).join(' ');
  assert.equal(preferred(80, 3, 16), 'T16 D16');
  assert.equal(preferred(80, 2, 20), 'D20 D20');
  assert.equal(preferred(110, 3, 25), 'T20 Bull');
  assert.equal(preferred(80, 3, 18), names(80));
  assert.equal(preferred(40, 3, 16), 'D20');
  assert.equal(preferred(80, 1, 16), undefined);
});

test('živý dopočet v X01 a na TV používá preferenci právě aktivního hráče', () => {
  const game = createGame({ startScore: 101, doubleOut: true, legsToWin: 1 }, [
    { id: 'a', name: 'Jana', color: '#ff7a1f', preferredDouble: 16 },
    { id: 'b', name: 'Petr', color: '#3fcfbf' },
  ]);
  const current = [makeDart(7, 3)];
  const jana = x01Display(deriveState({ ...game, current }), false);
  const petr = x01Display(deriveState({ ...game, visits: [[makeDart(0, 0)]], current }), false);
  assert.equal(jana.players.find(player => player.active)?.checkout?.map(dartLabel).join(' '), 'T16 D16');
  assert.equal(petr.players.find(player => player.active)?.checkout?.map(dartLabel).join(' '), 'T20 D10');
});

test('běžné přípravy mají přednost před neobvyklým triplem na oblíbený double', () => {
  for (const darts of [2, 3]) {
    assert.equal(names(61, darts), 'T15 D8');
    assert.equal(names(70, darts), 'T18 D8');
    assert.equal(names(76, darts), 'T20 D8');
    assert.equal(names(80, darts), 'T20 D10');
  }
  assert.equal(names(121), 'T20 S11 Bull');
  assert.equal(names(50), 'Bull');
});

test('se třemi šipkami běžná příprava, se dvěma jen skutečně dosažitelná cesta', () => {
  for (const [score, standard, short] of [
    [101, 'T20 S9 D16', 'T17 Bull'],
    [104, 'T16 S16 D20', 'T18 Bull'],
    [107, 'T19 S10 D20', 'T19 Bull'],
    [110, 'T20 S10 D20', 'T20 Bull'],
  ] as const) {
    assert.equal(names(score, 3), standard);
    assert.equal(names(score, 2), short);
    assert.equal(names(score, 1), undefined);
  }
});

test('začátek na 18/19 a bull zachová možnost zavření po typickém minutí', () => {
  for (const [score, expected, miss] of [
    [122, 'T18', makeDart(18, 1)],
    [123, 'T19', makeDart(19, 1)],
    [128, 'T18', makeDart(18, 1)],
    [129, 'T19', makeDart(19, 1)],
    [132, 'Bull', makeDart(25, 1)],
    [135, 'Bull', makeDart(25, 1)],
  ] as const) {
    assert.equal(suggestCheckout(score, 3)?.[0].name, expected);
    assert.ok(suggestCheckout(score - miss.score, 2), `oprava na ${score} po ${miss.name}`);
  }
  assert.equal(names(122 - 18, 2), 'T18 Bull');
  assert.equal(names(122 - 54, 2), 'T20 D4');
  assert.equal(names(122, 2), undefined); // První šipka úplně mimo: třetí už nepřibude.
});

test('všechna skóre a počty šipek: přesná nula, poslední double, žádné smyšlené nebo chybějící zavření', () => {
  // Nezávislé součty všech možných zásahů a finálních doublů, bez preferencí algoritmu.
  const scores = new Set([0, 25, 50]);
  for (let n = 1; n <= 20; n++) for (const m of [1, 2, 3]) scores.add(n * m);
  const doubles = [...Array.from({ length: 20 }, (_, i) => (i + 1) * 2), 50];
  let prefixes = new Set([0]);
  for (let darts = 1; darts <= 3; darts++) {
    const possible = new Set([...prefixes].flatMap(prefix => doubles.map(finish => prefix + finish)));
    for (let score = 2; score <= 170; score++) {
      const route = suggestCheckout(score, darts);
      assert.equal(!!route, possible.has(score), `${score}, ${darts} šipky`);
      if (!route) continue;
      assert.ok(route.length >= 1 && route.length <= darts);
      let left = score;
      route.forEach((dart, index) => {
        assert.ok(dart.number === 25 ? [1, 2].includes(dart.multiplier)
          : dart.number >= 1 && dart.number <= 20 && [1, 2, 3].includes(dart.multiplier));
        assert.equal(dart.score, dart.number * dart.multiplier);
        left -= dart.score;
        if (index < route.length - 1) assert.ok(left >= 2);
      });
      assert.equal(left, 0);
      assert.equal(route.at(-1)?.multiplier, 2);
    }
    prefixes = new Set([...prefixes].flatMap(prefix => [...scores].map(score => prefix + score)));
  }
});

test('neplatné vstupy nenavrhují zavření; více než tři šipky nepřidá další hod', () => {
  for (const score of [-1, 0, 1, 171, NaN, Infinity, 40.5]) assert.equal(suggestCheckout(score, 3), undefined);
  for (const darts of [-1, 0, NaN, Infinity, 1.5]) assert.equal(suggestCheckout(40, darts), undefined);
  assert.equal(names(170, 99), 'T20 T20 Bull');
});

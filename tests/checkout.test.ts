import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestCheckout } from '../src/game/checkout.ts';
import { dartLabel, makeDart } from '../src/game/x01.ts';

const names = (score: number, darts = 3) => suggestCheckout(score, darts)?.map(dartLabel).join(' ');

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

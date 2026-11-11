import test from 'node:test';
import assert from 'node:assert/strict';
import { gamePanelLayout } from '../src/game/panelLayout.ts';

test('panely drží rozumné meze a vejdou se do řádku s nejvýše třemi sloupci', () => {
  for (const width of [240, 320, 500, 734, 900, 1108, 1400, 1920, 4000]) {
    for (const height of [160, 400, 554, 574, 592, 620, 900, 2000]) {
      const layout = gamePanelLayout(width, height);
      assert.ok(layout.columns >= 1 && layout.columns <= 3);
      assert.ok(layout.tileWidth <= 480);
      assert.ok(layout.columns * layout.tileWidth + (layout.columns - 1) * 14 <= width);
      assert.ok(layout.tileHeight >= 270 && layout.tileHeight <= 360);
      assert.ok(layout.scoreSize >= 97 && layout.scoreSize <= 130);
      if (height >= 554) assert.ok(2 * layout.tileHeight + 14 <= height);
    }
  }
});

test('šest panelů se vejde i do maximalizovaného okna se zvětšením Windows na 125 %', () => {
  // Prostor panelů pod hlavičkou a nad ovládáním z uživatelova snímku.
  const layout = gamePanelLayout(1450, 576);
  assert.equal(layout.columns, 3);
  assert.ok(2 * layout.tileHeight + 14 <= 576);
  assert.ok(layout.tileHeight >= 270);
});

test('tři sloupce přejdou na dva a pak na jeden před zmenšením pod čitelnou šířku', () => {
  assert.equal(gamePanelLayout(1108, 700).columns, 3);
  assert.equal(gamePanelLayout(1107, 700).columns, 2);
  assert.equal(gamePanelLayout(734, 700).columns, 2);
  assert.equal(gamePanelLayout(733, 700).columns, 1);
  assert.equal(gamePanelLayout(320, 700).tileWidth, 320);
  assert.equal(gamePanelLayout(2000, 2000).tileWidth, 480);
});

const GAP = 14;
const MIN_WIDTH = 360;
const MAX_WIDTH = 480;
const MIN_HEIGHT = 270;
const MAX_HEIGHT = 360;

// Rozměry závisí pouze na prostoru okna, nikoli na počtu hráčů či klávesnici.
export function gamePanelLayout(availableWidth: number, availableHeight: number) {
  const width = Number.isFinite(availableWidth) ? Math.max(1, availableWidth) : MIN_WIDTH;
  const height = Number.isFinite(availableHeight) ? Math.max(1, availableHeight) : MIN_HEIGHT;
  const columns = Math.max(1, Math.min(3, Math.floor((width + GAP) / (MIN_WIDTH + GAP))));
  const tileWidth = Math.floor(Math.min(MAX_WIDTH, (width - GAP * (columns - 1)) / columns));
  const tileHeight = Math.floor(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, (height - GAP) / 2)));
  return { columns, tileWidth, tileHeight, scoreSize: Math.round(tileHeight * .36), viewportHeight: height };
}

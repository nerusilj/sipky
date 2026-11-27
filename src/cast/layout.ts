// Rozměry návrhu, nikoli vynucené HDMI rozlišení. Škálujeme do skutečného
// CSS viewportu receiveru; screen.width ani devicePixelRatio jeho velikost neurčují.
export const TV_WIDTH = 1920;
export const TV_HEIGHT = 1080;

export function tvViewport(width: number, height: number) {
  const viewportWidth = Number.isFinite(width) && width > 0 ? width : TV_WIDTH;
  const viewportHeight = Number.isFinite(height) && height > 0 ? height : TV_HEIGHT;
  const scale = Math.min(viewportWidth / TV_WIDTH, viewportHeight / TV_HEIGHT);
  return { width: viewportWidth, height: viewportHeight, scale };
}

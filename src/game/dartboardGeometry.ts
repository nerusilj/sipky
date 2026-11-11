import type { Dart } from './x01.ts';
export const BOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
export const BOARD_RADIUS = 170;
export const polar = (radius: number, degrees: number) => ({ x: radius * Math.sin(degrees * Math.PI / 180), y: -radius * Math.cos(degrees * Math.PI / 180) });
export function ringSector(inner: number, outer: number, angle: number): string {
  const a = polar(outer, angle - 9), b = polar(outer, angle + 9);
  const c = polar(inner, angle + 9), d = polar(inner, angle - 9);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}
export function impactPoint(dart: Dart): { x: number; y: number } | undefined {
  if (dart.bouncer || !dart.coords || !Number.isFinite(dart.coords.x) || !Number.isFinite(dart.coords.y)) return;
  // Board Manager: střed 0,0; hrana doublu r=1; kladné Y je nahoře.
  return { x: dart.coords.x * BOARD_RADIUS, y: -dart.coords.y * BOARD_RADIUS };
}
export function segmentHighlight(dart: Dart): { inner: number; outer: number; angle: number } | undefined {
  const index = BOARD_NUMBERS.indexOf(dart.number as typeof BOARD_NUMBERS[number]);
  if (index < 0 || dart.bouncer || dart.coords || !dart.multiplier) return;
  return { inner: dart.multiplier === 2 ? 162 : dart.multiplier === 3 ? 99 : 15.9,
    outer: dart.multiplier === 2 ? 170 : dart.multiplier === 3 ? 107 : 162, angle: index * 18 };
}
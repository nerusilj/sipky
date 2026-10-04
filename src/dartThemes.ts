// Barevné varianty ležaté šipky v horní liště: letky, akcent na násadci a jemná záře.
export interface DartTheme {
  name: string;
  light: string;
  mid: string;
  dark: string;
  seam: string;
  glow?: { color: string; opacity: number; blur: number };
}

export const DART_THEMES = {
  orange: { name: 'Oranžová', light: '#ffb06e', mid: '#ff7a1f', dark: '#c4520c', seam: '#5a2406' },
  amber: { name: 'Jantarová', light: '#ffd29a', mid: '#e8964a', dark: '#a85d22', seam: '#5c3412', glow: { color: '#ffae5c', opacity: 0.55, blur: 2.4 } },
  ice: { name: 'Ledově modrá', light: '#bfe6ff', mid: '#6cb8f0', dark: '#2f6fa8', seam: '#163a5c', glow: { color: '#5fb4ff', opacity: 0.55, blur: 2.4 } },
  teal: { name: 'Tyrkysová', light: '#b6f5ea', mid: '#3fcfbf', dark: '#1d8580', seam: '#0d4542', glow: { color: '#40e0c8', opacity: 0.5, blur: 2.4 } },
  mint: { name: 'Mátově zelená', light: '#c9f7d9', mid: '#5fd497', dark: '#2a8a5a', seam: '#124a2e', glow: { color: '#5fe0a0', opacity: 0.5, blur: 2.4 } },
  lavender: { name: 'Levandulová', light: '#e2d4ff', mid: '#a68cf0', dark: '#6950b8', seam: '#33256a', glow: { color: '#a88cff', opacity: 0.5, blur: 2.4 } },
  silver: { name: 'Stříbrná', light: '#ffffff', mid: '#c9ced6', dark: '#8a929e', seam: '#4a5059', glow: { color: '#ffe2b8', opacity: 0.45, blur: 2.6 } },
  red: { name: 'Tlumená rudá', light: '#ffb3a3', mid: '#e0614a', dark: '#9c3324', seam: '#541a12', glow: { color: '#ff6a50', opacity: 0.45, blur: 2.4 } },
} satisfies Record<string, DartTheme>;

export type DartThemeId = keyof typeof DART_THEMES;
export const DEFAULT_DART_THEME: DartThemeId = 'teal';

export function isDartThemeId(value: unknown): value is DartThemeId {
  return typeof value === 'string' && Object.hasOwn(DART_THEMES, value);
}

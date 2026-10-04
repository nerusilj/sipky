import type { ReactNode } from 'react';

// Vlastní tahové ikony 24×24 bez knihovny; barvu přebírají z textu.
type IconProps = { size?: number };
function Svg({ size = 24, children }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export const HomeIcon = (p: IconProps) => <Svg {...p}><path d="M3.5 10.5 12 3.8l8.5 6.7" /><path d="M5.8 9v11h4.4v-6h3.6v6h4.4V9" /></Svg>;
export const DartIcon = (p: IconProps) => <Svg {...p}><path d="M4 20 14.5 9.5" /><path d="m14.5 9.5 1.2-4.2L19.5 4l-1.3 3.8z" /><path d="m14.5 9.5 4.2-1.2" /><path d="M4 20l1-3.3 2.3 2.3z" /></Svg>;
export const PlayersIcon = (p: IconProps) => <Svg {...p}><circle cx="9" cy="8" r="3.3" /><path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" /><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2" /><path d="M17.6 14.6c1.8.6 3 2.3 3.4 4.9" /></Svg>;
export const SettingsIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.6" /></Svg>;
export const DevIcon = (p: IconProps) => <Svg {...p}><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m13.5 4.5-3 15" /></Svg>;
export const ChevronIcon = (p: IconProps) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>;

// Ležatá šipka letící doprava: tyrkysové letky s jemnou září, tmavý násadec, rýhovaný kovový barel a hrot.
export function DartMark({ width = 112 }: { width?: number }) {
  return <svg className="dart-mark" width={width} height={width * 32 / 128} viewBox="-4 -4 128 32" aria-hidden="true">
    <defs>
      <linearGradient id="dart-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f7f8fa" /><stop offset="0.45" stopColor="#c3c9d1" /><stop offset="0.55" stopColor="#8d96a1" /><stop offset="1" stopColor="#dfe3e8" />
      </linearGradient>
      <linearGradient id="dart-flight-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b6f5ea" /><stop offset="1" stopColor="#3fcfbf" />
      </linearGradient>
      <linearGradient id="dart-flight-bottom" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#1d8580" /><stop offset="1" stopColor="#3fcfbf" />
      </linearGradient>
      <filter id="dart-glow" x="-20%" y="-60%" width="140%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur" />
        <feFlood floodColor="#40e0c8" floodOpacity="0.5" />
        <feComposite in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g filter="url(#dart-glow)">
      <path d="M3 12 L12 1.5 L33 1.5 L29 12 Z" fill="url(#dart-flight-top)" />
      <path d="M3 12 L12 22.5 L33 22.5 L29 12 Z" fill="url(#dart-flight-bottom)" />
      <path d="M5 12 H31" stroke="#0d4542" strokeWidth="1" />
      <rect x="27" y="10.1" width="36" height="3.8" rx="1.6" fill="#2a2e35" />
      <rect x="56" y="9.9" width="3" height="4.2" rx="0.8" fill="#3fcfbf" />
      <path d="M61 8.2 Q62 7.2 64 7.2 H95 Q98 7.2 99.5 9 L101 10.6 V13.4 L99.5 15 Q98 16.8 95 16.8 H64 Q62 16.8 61 15.8 Z" fill="url(#dart-metal)" />
      <path d="M69 7.6 V16.4 M73 7.4 V16.6 M77 7.4 V16.6 M81 7.4 V16.6 M85 7.4 V16.6 M89 7.6 V16.4" stroke="#6f7883" strokeWidth="0.9" />
      <path d="M100.5 10.7 L118.5 12 L100.5 13.3 Z" fill="#d6dbe1" stroke="#9aa2ac" strokeWidth="0.4" />
    </g>
  </svg>;
}

// Výseč mezikruží terče se středem v 0,0; úhel 0° míří nahoru k dvacítce.
function wedge(r0: number, r1: number, a0: number, a1: number): string {
  const point = (r: number, deg: number) => {
    const a = (deg - 90) * Math.PI / 180;
    return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  };
  return r0 === 0 ? `M0 0L${point(r1, a0)}A${r1} ${r1} 0 0 1 ${point(r1, a1)}Z`
    : `M${point(r1, a0)}A${r1} ${r1} 0 0 1 ${point(r1, a1)}L${point(r0, a1)}A${r0} ${r0} 0 0 0 ${point(r0, a0)}Z`;
}
const SECTORS = Array.from({ length: 20 }, (_, i) => [i * 18 - 9, i * 18 + 9] as const);
// Plochy terče: výseče, trojitý a dvojitý kruh, každý střídavě světlý a tmavý.
const BOARD_LAYERS = [
  { r0: 0, r1: 92, light: 0.42, dark: 0.16 },
  { r0: 52, r1: 59, light: 0.95, dark: 0.5 },
  { r0: 85, r1: 92, light: 0.95, dark: 0.5 },
].map(layer => ({ ...layer, paths: SECTORS.map(([a0, a1], i) => ({ d: wedge(layer.r0, layer.r1, a0, a1), light: i % 2 === 0 })) }));

// Terč v barvě dlaždice (currentColor) s vyplněnými výsečemi.
export function TileBoard() {
  return <svg className="tile-board" viewBox="-112 -112 224 224" aria-hidden="true">
    <circle r="110" fill="#000" fillOpacity="0.45" />
    <circle r="110" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
    {BOARD_LAYERS.map((layer, index) => <g key={index}>{layer.paths.map((path, i) =>
      <path key={i} d={path.d} fill="currentColor" fillOpacity={path.light ? layer.light : layer.dark} />)}</g>)}
    <g stroke="#fff" strokeOpacity="0.14" strokeWidth="0.6" fill="none">
      {SECTORS.map(([a0], i) => <path key={i} d={`M0 0L0 -92`} transform={`rotate(${a0})`} />)}
      {[92, 85, 59, 52, 13].map(r => <circle key={r} r={r} />)}
    </g>
    <circle r="13" fill="currentColor" fillOpacity="0.7" /><circle r="5.5" fill="currentColor" />
  </svg>;
}

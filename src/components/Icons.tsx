import type { ReactNode } from 'react';

// Vlastní tahové ikony 24×24 bez knihovny; barvu přebírají z textu.
type IconProps = { size?: number };
function Svg({ size = 24, children }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

// Navigace má větší geometrické symboly s jemnou tónovanou výplní.
function NavigationSvg({ size = 26, children }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
export const HomeIcon = (p: IconProps) => <NavigationSvg {...p}>
  <path d="m3.5 10 7-6a2.3 2.3 0 0 1 3 0l7 6v8.5a2 2 0 0 1-2 2h-4v-6h-5v6h-4a2 2 0 0 1-2-2V10Z" fill="currentColor" fillOpacity=".1" />
</NavigationSvg>;
export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const SearchIcon = (p: IconProps) => <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="m5 12 4 4L19 6" /></Svg>;
export const DartIcon = (p: IconProps) => <NavigationSvg {...p}>
  <circle cx="10.5" cy="13.5" r="8" fill="currentColor" fillOpacity=".1" />
  <circle cx="10.5" cy="13.5" r="3.5" />
  <path d="m10.5 13.5 10-10M16 3.5h4.5V8" />
</NavigationSvg>;
export const PlayersIcon = (p: IconProps) => <NavigationSvg {...p}>
  <circle cx="8.5" cy="7.5" r="3.25" fill="currentColor" fillOpacity=".1" />
  <path d="M3 20v-1.5a5.5 5.5 0 0 1 11 0V20H3Z" fill="currentColor" fillOpacity=".1" />
  <path d="M15.5 4.5a3.25 3.25 0 0 1 0 6.5M18 14a5 5 0 0 1 3 4.5V20h-3" />
</NavigationSvg>;
export const PersonSilhouetteIcon = ({ size = 24 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" /></svg>;
export const SettingsIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.6" /></Svg>;
export const DevIcon = (p: IconProps) => <Svg {...p}><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m13.5 4.5-3 15" /></Svg>;
export const ChevronIcon = (p: IconProps) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>;
export const PencilIcon = (p: IconProps) => <Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const TrashIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></Svg>;
export const UndoIcon = (p: IconProps) => <Svg {...p}><path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12H9" /></Svg>;
export const StatsIcon = (p: IconProps) => <Svg {...p}><path d="M5 20v-7M12 20V5M19 20V9" /></Svg>;
export const TilesIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><rect x="14" y="14" width="7" height="7" rx="1.2" /></Svg>;
export const RowsIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" /></Svg>;
export const FocusPlayerIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="10" height="18" rx="1.5" /><path d="M17 5h4M17 12h4M17 19h4" /></Svg>;
export const SoundIcon = ({ muted = false, ...p }: IconProps & { muted?: boolean }) => <Svg {...p}>
  <path d="M11 4 6 8H3v8h3l5 4V4Z" />
  {muted ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 4a11 11 0 0 1 0 16" /></>}
</Svg>;
export const EffectsIcon = ({ disabled = false, ...p }: IconProps & { disabled?: boolean }) => <Svg {...p}>
  <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
  {disabled && <path d="m3 3 18 18" />}
</Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const PlayIcon = (p: IconProps) => <Svg {...p}><path d="m8 5 11 7-11 7V5Z" /></Svg>;
export const StopIcon = (p: IconProps) => <Svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" /></Svg>;
export const EjectIcon = (p: IconProps) => <Svg {...p}><path d="m5 13 7-8 7 8Z" fill="currentColor" /><path d="M5 18h14" strokeWidth="2.5" /></Svg>;
export const TrophyIcon = (p: IconProps) => <Svg {...p}><path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v6M7 21h10" /></Svg>;
export const BoardConnectionIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></Svg>;
export const KeyboardIcon = (p: IconProps) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 13h.1M10 13h.1M14 13h.1M18 13h.1M8 16h8" /></Svg>;
export const PinIcon = (p: IconProps) => <Svg {...p}><path d="m16 3 5 5-3 1-4 4v4l-7-7h4l4-4 1-3Z" /><path d="m10.5 13.5-7 7" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>;
export const ExitIcon = (p: IconProps) => <Svg {...p}><path d="M20 8V4H4v16h16v-4M21 12H9m4-4-4 4 4 4" /></Svg>;
export const VisitDartIcon = () => <svg width="70" height="24" viewBox="0 0 88 24" aria-hidden="true"><path d="m2 12 6-9h13l8 9-8 9H8Z" fill="currentColor" /><path d="M26 12h41" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M67 12h17" stroke="currentColor" strokeWidth="1" /></svg>;

// Výseč mezikruží terče se středem v 0,0; úhel 0° míří nahoru k dvacítce.
export function wedge(r0: number, r1: number, a0: number, a1: number): string {
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

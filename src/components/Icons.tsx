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

export function BoardLogo({ size = 34 }: IconProps) {
  const sectors = Array.from({ length: 20 }, (_, i) => i * 18);
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#1b1410" stroke="var(--orange)" strokeWidth="2" />
    {sectors.map(angle => <path key={angle} d="M20 20 L20 3.5" stroke={angle % 36 ? '#3a2a1f' : 'var(--orange)'} strokeWidth="2.6" transform={`rotate(${angle} 20 20)`} />)}
    <circle cx="20" cy="20" r="11" fill="none" stroke="var(--orange)" strokeWidth="1.4" />
    <circle cx="20" cy="20" r="3.4" fill="var(--orange)" />
  </svg>;
}

export function TargetArt() {
  const rings = [56, 50, 34, 28, 10, 4];
  return <svg className="target-art" viewBox="0 0 120 120" aria-hidden="true">
    {Array.from({ length: 20 }, (_, i) => <path key={i} d="M60 60 L60 4" stroke="currentColor" strokeWidth="0.8" transform={`rotate(${i * 18 + 9} 60 60)`} />)}
    {rings.map(r => <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth={r === 56 ? 1.6 : 0.9} />)}
  </svg>;
}

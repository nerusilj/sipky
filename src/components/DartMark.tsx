import { useId } from 'react';
import { DART_THEMES } from '../dartThemes.ts';
import type { DartTheme, DartThemeId } from '../dartThemes.ts';

// Ležatá šipka letící doprava: barevné letky (volitelně s jemnou září), tmavý násadec, rýhovaný kovový barel a hrot.
export default function DartMark({ theme, width = 112 }: { theme: DartThemeId; width?: number }) {
  const t: DartTheme = DART_THEMES[theme];
  // Každá instance potřebuje vlastní id přechodů a filtru (v Nastavení je jich víc najednou).
  const id = `dart${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <svg className="dart-mark" width={width} height={width * 32 / 128} viewBox="-4 -4 128 32" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f7f8fa" /><stop offset="0.45" stopColor="#c3c9d1" /><stop offset="0.55" stopColor="#8d96a1" /><stop offset="1" stopColor="#dfe3e8" />
      </linearGradient>
      <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.light} /><stop offset="1" stopColor={t.mid} /></linearGradient>
      <linearGradient id={`${id}-bottom`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor={t.dark} /><stop offset="1" stopColor={t.mid} /></linearGradient>
      {t.glow && <filter id={`${id}-glow`} x="-20%" y="-60%" width="140%" height="220%">
        <feGaussianBlur stdDeviation={t.glow.blur} result="blur" />
        <feFlood floodColor={t.glow.color} floodOpacity={t.glow.opacity} />
        <feComposite in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>}
    </defs>
    <g filter={t.glow ? `url(#${id}-glow)` : undefined}>
      <path d="M3 12 L12 1.5 L33 1.5 L29 12 Z" fill={`url(#${id}-top)`} />
      <path d="M3 12 L12 22.5 L33 22.5 L29 12 Z" fill={`url(#${id}-bottom)`} />
      <path d="M5 12 H31" stroke={t.seam} strokeWidth="1" />
      <rect x="27" y="10.1" width="36" height="3.8" rx="1.6" fill="#2a2e35" />
      <rect x="56" y="9.9" width="3" height="4.2" rx="0.8" fill={t.mid} />
      <path d="M61 8.2 Q62 7.2 64 7.2 H95 Q98 7.2 99.5 9 L101 10.6 V13.4 L99.5 15 Q98 16.8 95 16.8 H64 Q62 16.8 61 15.8 Z" fill={`url(#${id}-metal)`} />
      <path d="M69 7.6 V16.4 M73 7.4 V16.6 M77 7.4 V16.6 M81 7.4 V16.6 M85 7.4 V16.6 M89 7.6 V16.4" stroke="#6f7883" strokeWidth="0.9" />
      <path d="M100.5 10.7 L118.5 12 L100.5 13.3 Z" fill="#d6dbe1" stroke="#9aa2ac" strokeWidth="0.4" />
    </g>
  </svg>;
}

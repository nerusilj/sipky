import { wedge } from './Icons.tsx';

// Pořadí čísel na terči po směru hodin od dvacítky nahoře.
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// Poloměry polí v mm (vnější okraj doublu = 170 mm).
const R = { outerBull: 16, trebleIn: 99, trebleOut: 107, doubleIn: 162, doubleOut: 170, numbers: 192 };

export interface HighlightedBed { number: number; multiplier: number }

function arc(r: number, a0: number, a1: number): string {
  const point = (deg: number) => { const t = (deg - 90) * Math.PI / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
  return `M${point(a0)}A${r} ${r} 0 0 1 ${point(a1)}`;
}

// Výřez terče kolem zvýrazněných čísel; zvýrazněná pole blikají (single = vnitřní i vnější single).
export default function BoardSectors({ highlight }: { highlight: HighlightedBed[] }) {
  const angleOf = (n: number) => { const i = BOARD_ORDER.indexOf(n); return (i > 10 ? i - 20 : i) * 18; };
  const angles = highlight.map(bed => angleOf(bed.number));
  const center = (Math.min(...angles) + Math.max(...angles)) / 2;
  // Zvýrazněná čísla a jedno sousední z každé strany.
  const from = Math.min(...angles) - 18, to = Math.max(...angles) + 18;
  const sectors = BOARD_ORDER.map(n => ({ n, a: angleOf(n) })).filter(s => s.a >= from && s.a <= to);
  const lit = (n: number, multiplier: number) => highlight.some(bed => bed.number === n && bed.multiplier === multiplier);
  const beds = (n: number, a: number, dark: boolean) => [
    { key: 's1', r0: R.outerBull, r1: R.trebleIn, m: 1, fill: dark ? '#1c2026' : '#2b3038' },
    { key: 't', r0: R.trebleIn, r1: R.trebleOut, m: 3, fill: dark ? '#7a3a12' : '#13584f' },
    { key: 's2', r0: R.trebleOut, r1: R.doubleIn, m: 1, fill: dark ? '#1c2026' : '#2b3038' },
    { key: 'd', r0: R.doubleIn, r1: R.doubleOut, m: 2, fill: dark ? '#7a3a12' : '#13584f' },
  ].map(bed => <path key={`${n}${bed.key}`} d={wedge(bed.r0, bed.r1, a - 9, a + 9)} fill={bed.fill}
    stroke="#0b0d10" strokeWidth="2.2" strokeLinejoin="round" className={lit(n, bed.m) ? 'bed-lit' : undefined} />);
  const label = (a: number) => {
    const rad = (a - 90) * Math.PI / 180;
    return { x: R.numbers * Math.cos(rad), y: R.numbers * Math.sin(rad) };
  };
  return <svg className="board-sectors" viewBox="-150 -212 300 236" aria-hidden="true">
    <g transform={`rotate(${-center})`}>
      <path d={wedge(0, 208, from - 9, to + 9)} fill="#0b0d10" />
      {sectors.map(({ n, a }) => <g key={n} className={highlight.some(bed => bed.number === n) ? '' : 'sector-dim'}>{beds(n, a, BOARD_ORDER.indexOf(n) % 2 === 0)}</g>)}
      <g stroke="#c9ced6" strokeOpacity="0.35" strokeWidth="1" fill="none">
        {[R.outerBull, R.trebleIn, R.trebleOut, R.doubleIn, R.doubleOut].map(r => <path key={r} d={arc(r, from - 9, to + 9)} />)}
      </g>
      <circle r={R.outerBull} fill="#13584f" /><circle r="6.4" fill="#7a3a12" />
      {sectors.map(({ n, a }) => { const p = label(a); return <text key={n} x={p.x} y={p.y} transform={`rotate(${a} ${p.x} ${p.y})`}
        className={highlight.some(bed => bed.number === n) ? 'sector-number lit' : 'sector-number'}>{n}</text>; })}
    </g>
  </svg>;
}

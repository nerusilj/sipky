import { dartLabel } from '../game/x01.ts';
import type { Dart } from '../game/x01.ts';
import { BOARD_NUMBERS, impactPoint, polar, ringSector, segmentHighlight } from '../game/dartboardGeometry.ts';

export default function Dartboard({ darts }: { darts: readonly Dart[] }) {
  const shown = darts.slice(0, 3);
  return <div className="live-dartboard">
    <svg className="live-dartboard-svg" viewBox="-212 -212 424 424" role="img" aria-label="Šipkový terč se zásahy aktuálního kola">
      <circle r="208" fill="#14181c" />


      {BOARD_NUMBERS.map((number, index) => <g key={number}>
        <path d={ringSector(15.9, 170, index * 18)} fill={index % 2 ? '#ddd0b1' : '#191a17'} />
        <path d={ringSector(99, 107, index * 18)} fill={index % 2 ? '#2b7456' : '#bd343a'} />
        <path d={ringSector(162, 170, index * 18)} fill={index % 2 ? '#2b7456' : '#bd343a'} />
      </g>)}
      <circle r="15.9" fill="#2b7456" /><circle r="6.35" fill="#bd343a" />
      <g fill="none" stroke="#d0d0bd" strokeWidth=".65">
        {[6.35, 15.9, 99, 107, 162, 170].map(radius => <circle key={radius} r={radius} />)}
        {BOARD_NUMBERS.map((_, index) => { const a = polar(15.9, index * 18 + 9), b = polar(170, index * 18 + 9);
          return <path key={index} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />; })}
      </g>
      <g fill="#e5e5de" fontSize="21" fontFamily="Arial, sans-serif" textAnchor="middle" dominantBaseline="central">
        {BOARD_NUMBERS.map((number, index) => { const p = polar(190, index * 18); return <text key={number} x={p.x} y={p.y}>{number}</text>; })}
      </g>
      <g stroke="#fff" fill="#fff" fillOpacity=".17" strokeWidth="1.5">
        {shown.map((dart, index) => {
          const segment = segmentHighlight(dart);
          if (segment) return <g key={index}>
            {dart.multiplier === 1 ? <><path d={ringSector(15.9, 99, segment.angle)} /><path d={ringSector(107, 162, segment.angle)} /></> : <path d={ringSector(segment.inner, segment.outer, segment.angle)} />}
          </g>;
          if (!dart.coords && !dart.bouncer && dart.number === 25) return dart.multiplier === 2
            ? <circle key={index} r="6.35" /> : <circle key={index} r="11.125" fill="none" strokeWidth="9.55" strokeOpacity=".3" />;
          return null;
        })}
      </g>
      {shown.map((dart, index) => {
        const p = impactPoint(dart);
        if (!p || Math.hypot(p.x, p.y) > 223) return null;
        return <g key={index} className="dartboard-impact" data-dart={index + 1}><title>{`${index + 1}. šipka: ${dartLabel(dart)}`}</title>
          <circle className="dartboard-impact-ring" cx={p.x} cy={p.y} r="7" fill="none" stroke="#fff" strokeWidth="1.5" pointerEvents="none" aria-hidden="true" />
          <circle cx={p.x} cy={p.y} r="3.8" fill="#fff" stroke="#10141a" strokeWidth="1.5" />
        </g>;
      })}
    </svg>
  </div>;
}

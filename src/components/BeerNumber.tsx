import type { CSSProperties } from 'react';
import sevenUrl from '../assets/effects/radkovina-number-7.png';
import nineteenUrl from '../assets/effects/radkovina-number-19.png';
import threeUrl from '../assets/effects/radkovina-number-3.png';

const ART: Record<number, string> = { 7: sevenUrl, 19: nineteenUrl, 3: threeUrl };
const BUBBLES = [31, 42, 53, 65, 37, 59, 72, 46];
const SPRAY = [[-.12, -.17], [-.085, -.235], [-.07, -.16], [-.045, -.19], [-.015, -.255], [.025, -.215], [.06, -.25], [.07, -.155], [.095, -.18], [.13, -.205]];

// Stejný podklad tvoří jemný skleněný obrys, stoupající pivo i masku bublinek.
export default function BeerNumber({ number }: { number: number }) {
  const art = ART[number];
  return <div className="beer-number" style={{ '--beer-number-art': `url("${art}")` } as CSSProperties}>
    <div className="beer-number-glow" />
    <img className="beer-number-glass" src={art} alt="" draggable={false} />
    <div className="beer-number-liquid"><img src={art} alt="" draggable={false} /></div>
    <div className="beer-number-fizz">{BUBBLES.map((x, i) => <i key={i} style={{
      '--bubble-x': `${x}%`, '--bubble-delay': `${i * -.37}s`, '--bubble-size': `${2 + i % 3}px`,
    } as CSSProperties} />)}</div>
    {(number === 19 ? [26, 69] : [50]).map(x => <div key={x} className="beer-number-burst" style={{ '--vent-x': `${x}%` } as CSSProperties}>
      {SPRAY.map(([dx, dy], i) => <i key={i} style={{
        '--spray-dx': dx * 1.12, '--spray-dy': dy * 1.1, '--spray-delay': `${i * .018}s`, '--spray-size': `${4.2 + i % 3 * 1.05}px`,
      } as CSSProperties} />)}
    </div>)}
  </div>;
}

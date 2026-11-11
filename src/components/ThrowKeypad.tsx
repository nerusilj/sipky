import SegmentedControl from './SegmentedControl.tsx';
import { makeDart } from '../game/x01.ts';
import type { Dart } from '../game/x01.ts';
export default function ThrowKeypad({ disabled, completing, multiplier, onMultiplier, onHit }: {
  disabled: boolean; completing: boolean;
  multiplier: number; onMultiplier: (value: number) => void; onHit: (dart: Dart) => void;
}) {
  return <section id="game-keypad" className="keypad-surface keypad-docked card" aria-label="Klávesnice pro zadání hodu" aria-busy={completing}>
    <Keypad disabled={disabled} onHit={onHit} multiplier={multiplier} onMultiplier={onMultiplier} />
  </section>;
}
function Keypad({ disabled, onHit, multiplier, onMultiplier }: {
  disabled: boolean; onHit: (dart: Dart) => void;
  multiplier: number; onMultiplier: (value: number) => void;
}) {
  const hit = (number: number, m: number) => { onHit(makeDart(number, m)); onMultiplier(1); };
  const segment = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S';
  return <section className="keypad" aria-label="Ruční zadání šipek">
    <SegmentedControl className="keypad-mods" variant="underline" label="Násobek hodu" value={multiplier} onChange={onMultiplier} disabled={disabled}
      options={[{ value: 1, label: 'Single' }, { value: 2, label: 'Double' }, { value: 3, label: 'Triple' }]} />
    <div className="keypad-numbers">
      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <button key={n} disabled={disabled} aria-label={`${segment}${n}`} onClick={() => hit(n, multiplier)}><span className="keypad-segment">{segment}</span><strong>{n}</strong></button>)}
    </div>
    <div className="keypad-special">
      <button disabled={disabled} onClick={() => hit(25, 1)}>25</button>
      <button disabled={disabled} onClick={() => hit(25, 2)}>BULL</button>
      <button disabled={disabled} className="miss" onClick={() => hit(0, 0)}>MIMO</button>
    </div>
  </section>;
}

import type { CSSProperties } from 'react';
import { EFFECTS } from '../effects/effectRules.ts';
import type { EffectRule } from '../effects/effectRules.ts';
import BoardSectors from './BoardSectors.tsx';
import { dismissEffect, useActiveEffect } from '../effects/effects.ts';

const COLORS = ['#ff7a1f', '#ffd29a', '#3fcfbf', '#b6f5ea', '#ffffff', '#ff6a50', '#a68cf0'];
// Konfety s pevným „náhodným“ rozložením, aby se při každém vykreslení nehýbaly jinak.
const CONFETTI = Array.from({ length: 56 }, (_, i) => {
  const angle = (i * 137.5) % 360 * Math.PI / 180;
  const distance = 30 + ((i * 53) % 45);
  return {
    '--dx': `${Math.cos(angle) * distance}vmax`, '--dy': `${Math.sin(angle) * distance}vmax`,
    '--rot': `${(i * 97) % 720 - 360}deg`, '--delay': `${(i % 7) * 40}ms`, '--color': COLORS[i % COLORS.length],
  } as CSSProperties;
});

// Efekt přes celou obrazovku; kliknutím se zavře dřív.
export default function EffectOverlay() {
  const active = useActiveEffect();
  if (!active) return null;
  const effect: EffectRule = EFFECTS[active.id];
  return <div key={active.key} className="effect-overlay" role="alert" onClick={dismissEffect}>
    <div className="effect-rings" aria-hidden="true"><span /><span /><span /></div>
    <div className="effect-confetti" aria-hidden="true">{CONFETTI.map((style, i) => <i key={i} style={style} />)}</div>
    <div className="effect-text" aria-label={`${effect.title} ${effect.subtitle}`}><strong>{effect.title}</strong>
      {effect.highlight ? <BoardSectors highlight={effect.highlight} /> : <span>{effect.subtitle}</span>}</div>
  </div>;
}

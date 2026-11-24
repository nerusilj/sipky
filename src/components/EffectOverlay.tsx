import type { CSSProperties } from 'react';
import { EFFECTS } from '../effects/effectRules.ts';
import type { EffectRule } from '../effects/effectRules.ts';
import BoardSectors from './BoardSectors.tsx';
import BeerNumber from './BeerNumber.tsx';
import { dismissEffect, effectDurationMs, useActiveEffect } from '../effects/effects.ts';
import type { ActiveEffect } from '../effects/effects.ts';

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
  return <EffectVisual active={useActiveEffect()} onDismiss={dismissEffect} />;
}

export function EffectVisual({ active, onDismiss, lightweight = false }: {
  active?: ActiveEffect; onDismiss?: () => void; lightweight?: boolean;
}) {
  if (!active) return null;
  const effect: EffectRule = EFFECTS[active.id];
  const className = `effect-overlay${lightweight ? ' effect-overlay--tv' : ''}`;
  if (effect.beerNumbers) return <div key={active.key} className={`${className} beer-numbers`} role="alert"
    aria-label={`${effect.title} ${effect.subtitle}`}
    style={{ animationDuration: `${effectDurationMs(active.id)}ms` }} onClick={onDismiss}>
    <div className="beer-numbers-heading" aria-hidden="true">
      <strong className="beer-heading-glass">{effect.title}</strong>
      <strong className="beer-heading-liquid">{effect.title}</strong>
      <strong className="beer-heading-foam">{effect.title}</strong>
    </div>
    <div className="beer-numbers-row" aria-hidden="true">
      {effect.beerNumbers.map(number => <BeerNumber key={number} number={number} lightweight={lightweight} />)}
    </div>
  </div>;
  return <div key={active.key} className={className} role="alert" onClick={onDismiss}>
    {!lightweight && <div className="effect-rings" aria-hidden="true"><span /><span /><span /></div>}
    <div className="effect-confetti" aria-hidden="true">{(lightweight ? CONFETTI.slice(0, 18) : CONFETTI).map((style, i) => <i key={i} style={style} />)}</div>
    <div className="effect-text" aria-label={`${effect.title} ${effect.subtitle}`}><strong>{effect.title}</strong>
      {effect.highlight ? <BoardSectors highlight={effect.highlight} /> : <span>{effect.subtitle}</span>}</div>
  </div>;
}

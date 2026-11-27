import PlayerName from './PlayerName.tsx';
import PlacementBadge from './PlacementBadge.tsx';
import { PencilIcon, VisitDartIcon } from './Icons.tsx';
import { dartLabel, DARTS_PER_VISIT } from '../game/x01.ts';
import { legCount } from '../game/x01Presentation.ts';
import type { X01VisitState, x01PlayerScore } from '../game/x01Presentation.ts';
import type { Dart } from '../game/x01.ts';

function BustFragments() {
  return <div className="bust-fragments" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>;
}

export function X01Visit({ state, darts, selected, onSelect, readOnly }: { state: X01VisitState; darts: Dart[]; selected?: number; onSelect?: (index: number) => void; readOnly?: boolean }) {
  const finished = state.winner !== undefined;
  const last = finished && !state.lastLegByBullOff ? state.history[state.history.length - 1] : undefined;
  const shown = finished ? last?.darts ?? [] : darts;
  const result = last ?? state.visitResult;
  const total = state.bullOff ? shown[0]?.score ?? 0 : result.scored;
  return <section className={`visit-strip ${result.bust ? 'has-bust' : ''}`} aria-label="Aktuální hody" aria-live="polite">
    {result.bust && <BustFragments />}
    {Array.from({ length: DARTS_PER_VISIT }, (_, i) => {
      const label = `${i + 1}. šipka: ${shown[i] ? dartLabel(shown[i]) : 'neházeno'}`;
      const className = `visit-slot ${shown[i] ? 'filled' : 'empty'}`;
      const content = <>{shown[i] ? <strong className="dart-register" key={dartLabel(shown[i])}>{dartLabel(shown[i])}</strong> : <VisitDartIcon />}
        {selected === i && <span className="visit-edit-icon"><PencilIcon size={15} /></span>}</>;
      if (readOnly) return <div key={i} className={className} aria-label={label}>{content}</div>;
      // Při potvrzení kola zachovat stejný element: button → div by znovu spustilo animaci všech čísel.
      return <button type="button" key={i} className={className} aria-label={label} aria-pressed={selected === i}
        title={shown[i] ? `Opravit ${i + 1}. šipku` : `Zadat ${i + 1}. šipku`}
        disabled={!onSelect || (!shown[i] && (i !== shown.length || state.visitResult.closed))} onClick={() => onSelect?.(i)}>{content}</button>;
    })}
    <div className={`visit-total ${result.bust ? 'bust' : ''}`} aria-label={result.bust ? 'Výsledek kola: BUST' : `Skóre kola: ${total}`}>
      {(state.bullOff || finished && state.lastLegByBullOff) && <span>Rozhoz</span>}
      <strong>{result.bust ? 'BUST' : total}</strong></div>
  </section>;
}

export function X01PlayerCard({ score }: { score: ReturnType<typeof x01PlayerScore> }) {
  const { index, player, active, busted, place, legsWon, remaining, shownDarts, visitTotal,
    visitBusted, dartNumber, legAverage, checkout, checkoutSetup, winner } = score;
  const route = checkout ?? checkoutSetup?.route;
  const routeText = route?.map(dartLabel).join(' → ');
  const hintLabel = checkoutSetup ? `Připravit: ${routeText}` : `Zavřít: ${routeText}`;
  return <section className={`score-card card ${active ? 'active' : ''} ${busted ? 'has-bust' : ''} ${winner ? 'winner' : ''} ${place !== undefined ? 'done' : ''}`} aria-label={player.name} data-player-index={index}>
    {busted && <BustFragments />}
    {place !== undefined && <PlacementBadge place={place} />}
    <div className="score-head">
      <div className="score-player-details"><PlayerName {...player} avatarSeed={player.id} avatarSize={52} className="plain" /></div>
    </div>
    <div className="player-score-line"><div className="score-remaining">{remaining}</div>
      <span className="player-legs-badge" aria-label={`Vyhrané legy: ${legsWon}`} title={`Vyhráno ${legCount(legsWon)}`}><span>{legsWon}</span></span>
    </div>
    <div className={`player-bottom ${route ? 'has-checkout' : ''}`}>
    <div className="player-visit-strip" role="group" aria-hidden={!!route} aria-label={active ? 'Aktuální hody hráče' : 'Poslední kolo hráče'}>
      {Array.from({ length: DARTS_PER_VISIT }, (_, i) => <div key={i} className={`player-visit-slot ${shownDarts[i] ? 'filled' : 'empty'}`}
        aria-label={`${i + 1}. šipka: ${shownDarts[i] ? dartLabel(shownDarts[i]) : 'neházeno'}`}>
        {shownDarts[i] ? <strong>{dartLabel(shownDarts[i])}</strong> : <VisitDartIcon />}
      </div>)}
      <div className="player-visit-slot player-visit-total" aria-label={visitBusted ? 'Výsledek kola: BUST' : `Skóre kola: ${visitTotal}`}>
        <strong>{visitBusted ? 'BUST' : visitTotal}</strong>
      </div>
    </div>
    <div className="player-leg-summary" role="group" aria-hidden={!!route} aria-label="Šipky a průměr aktuálního legu">
      <span className="leg-dart-number" aria-label={`Hozené šipky v legu: ${dartNumber}`}
        title={`V aktuálním legu hozeno ${dartNumber} šipek`}><VisitDartIcon /><strong>{dartNumber}</strong></span>
      <span className="leg-summary-divider" aria-hidden="true" />
      <span className="leg-average" aria-label={`Průměr aktuálního legu na 3 šipky: ${legAverage}`} title="Průměr aktuálního legu na 3 šipky"><span aria-hidden="true">Ø</span><strong>{legAverage}</strong></span>
    </div>
    {route && <div className={`player-checkout${checkoutSetup ? ' player-checkout-setup' : ''}`} role="group"
      aria-label={hintLabel} title={hintLabel}>
      <div className="player-checkout-route" aria-hidden="true">{route.map((dart, i) =>
        <span className="player-checkout-step" key={i}><strong className={!checkoutSetup && i === route.length - 1 ? 'checkout-finish' : ''}>{dartLabel(dart)}</strong>
          {i < route.length - 1 && <span className="checkout-arrow">→</span>}</span>)}
      </div>
    </div>}
    </div>
  </section>;
}

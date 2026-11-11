import { useEffect, useRef } from 'react';
import { CloseIcon, DartIcon } from './Icons.tsx';
import { finishLegByBullOff, useGame } from '../game/gameStore.ts';
import type { X01State } from '../game/x01.ts';

export default function FinishLegDialog({ state, onClose }: { state: X01State; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const { completing, bullOffResultOpen } = useGame();
  const waiting = !!state.visit.length || !!completing;
  const enoughPlayers = state.order.filter(p => !state.finished.includes(p)).length >= 2;
  const canStart = state.winner === undefined && !state.bullOff && !bullOffResultOpen && !waiting && enoughPlayers;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal(); cancel.current?.focus();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} id="finish-leg-dialog" className="end-game-dialog" aria-labelledby="finish-leg-title" aria-describedby="finish-leg-description"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="end-dialog-body">
      <div className="end-dialog-top"><span className="end-dialog-symbol" aria-hidden="true"><DartIcon size={25} /></span>
        <button className="icon-button" aria-label="Zavřít dialog" onClick={onClose}><CloseIcon size={22} /></button></div>
      <h2 id="finish-leg-title">Rozhodnout leg rozhozem na střed?</h2>
      <p id="finish-leg-description">Rozhoz určí zbývající pořadí a ukončí aktuální leg. Hráči, kteří už zavřeli, si své pořadí ponechají. Potom pokračujete dalším legem podle pravidel zápasu.</p>
      {canStart && <p>Každý hází jednu šipku. BULL a 25 vytáhněte, ostatní šipky nechte v terči.</p>}
      {waiting ? <p role="status">Nejdřív dokončete rozehrané kolo a vytáhněte šipky.</p>
        : !enoughPlayers && <p role="status">Rozhoz potřebuje alespoň dva hráče, kteří ještě nezavřeli.</p>}
    </div>
    <div className="end-dialog-actions">
      <button ref={cancel} onClick={onClose}>Zpět do hry</button>
      <button className="primary" disabled={!canStart} onClick={() => { if (finishLegByBullOff()) onClose(); }}><DartIcon size={20} />Spustit rozhoz</button>
    </div>
  </dialog>;
}

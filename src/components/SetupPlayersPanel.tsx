import type { ReactNode } from 'react';
import Toggle from './Toggle.tsx';

export default function SetupPlayersPanel({ loaded, count, randomOrder, onRandomOrder, children }: {
  loaded: boolean;
  count: number;
  randomOrder: boolean;
  onRandomOrder: (value: boolean) => void;
  children: ReactNode;
}) {
  return <section className={`settings-card card setup-section setup-players-panel${count >= 4 ? ' setup-players-panel--many' : ''}`} aria-label="Hráči">
    <div className="setup-players">
      {loaded ? children : <p className="muted">Načítám hráče…</p>}
    </div>
    <div className="setup-random-order">
      <Toggle checked={randomOrder} disabled={!loaded} onChange={onRandomOrder}>Náhodné pořadí</Toggle>
    </div>
  </section>;
}

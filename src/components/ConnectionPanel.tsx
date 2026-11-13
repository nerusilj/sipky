import type { ConnectionState } from '../autodarts/types.ts';
import Toggle from './Toggle.tsx';

export const STATE_LABELS: Record<ConnectionState, string> = {
  disconnected: 'Nepřipojeno', connecting: 'Připojování…', connected: 'Připojeno', reconnecting: 'Obnovování spojení…',
};

export default function ConnectionPanel({ enabled, onEnabled, address, state, onAddress, onConnect, onDisconnect }: {
  enabled: boolean; onEnabled: (value: boolean) => void; address: string; state: ConnectionState;
  onAddress: (value: string) => void; onConnect: () => void; onDisconnect: () => void;
}) {
  const active = state !== 'disconnected';
  return <section className="connection card" aria-labelledby="connection-title">
    <div className="caller-head">
      <div><span className="eyebrow">PŘIPOJENÍ</span><h2 id="connection-title">Autodarts</h2></div>
      <Toggle checked={enabled} onChange={onEnabled}>Používat Autodarts</Toggle>
    </div>
    {enabled ? <>
    <span className={`badge ${state === 'connected' ? '' : 'amber'}`}>{STATE_LABELS[state].toUpperCase()}</span>
    <p>Zadejte adresu terče. Hody se v rozehrané hře započítávají automaticky.</p>
    <div className="connection-grid">
      <label className="address-field"><span className="field-label">ADRESA TERČE</span>
        <input value={address} disabled={active} spellCheck={false} placeholder="127.0.0.1:3180"
          onChange={event => onAddress(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !active) onConnect(); }} /></label>

    </div>
    <div className="connection-actions">
      <button className="primary" onClick={onConnect} disabled={active}>Připojit</button>
      <button onClick={onDisconnect} disabled={!active}>Odpojit</button>
      <span className="muted small">{state === 'reconnecting' ? 'Board Manager neodpovídá, spojení se automaticky obnovuje.' : 'Terč posílá zprávy jen při změně, například po hodu nebo vytažení šipek.'}</span>
    </div>
    <details className="connection-technical"><summary>Technické podrobnosti</summary><p>Šipky čtou hody z místního Board Manageru přes /api/events. Start, Stop a Reset detekce jsou na úvodní kartě Autodarts. Účet Autodarts není potřeba.</p></details>
    </> : <p>Hody se zadávají ručně herní klávesnicí.</p>}
  </section>;
}

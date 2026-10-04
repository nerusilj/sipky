import type { ConnectionState } from '../autodarts/types.ts';

export const STATE_LABELS: Record<ConnectionState, string> = {
  disconnected: 'Nepřipojeno', connecting: 'Připojování…', connected: 'Připojeno', reconnecting: 'Obnovování spojení…',
};

export default function ConnectionPanel({ address, state, onAddress, onConnect, onDisconnect }: {
  address: string; state: ConnectionState;
  onAddress: (value: string) => void; onConnect: () => void; onDisconnect: () => void;
}) {
  const active = state !== 'disconnected';
  return <section className="connection card" aria-labelledby="connection-title">
    <div className="section-heading"><span className="eyebrow">01 / PŘIPOJENÍ</span><span className={`badge ${state === 'connected' ? '' : 'amber'}`}>{STATE_LABELS[state].toUpperCase()}</span></div>
    <h2 id="connection-title">Lokální Board Manager</h2>
    <p>Inspektor poslouchá události terče z Board Manageru na vaší síti. Nic neodesílá, neovládá detekci ani hru a nepotřebuje účet Autodarts.</p>
    <div className="connection-grid">
      <label className="address-field"><span className="field-label">ADRESA TERČE</span>
        <input value={address} disabled={active} spellCheck={false} placeholder="127.0.0.1:3180"
          onChange={event => onAddress(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !active) onConnect(); }} /></label>
      <div><span className="field-label">ODBĚR</span><code>/api/events</code></div>
      <div><span className="field-label">REŽIM</span><span className="muted">Pouze čtení</span></div>
    </div>
    <div className="connection-actions">
      <button className="primary" onClick={onConnect} disabled={active}><span aria-hidden="true">↗</span> Připojit</button>
      <button onClick={onDisconnect} disabled={!active}>Odpojit</button>
      <span className="muted small">{state === 'reconnecting' ? 'Board Manager neodpovídá, spojení se automaticky obnovuje.' : 'Terč posílá zprávy jen při změně, například po hodu nebo vytažení šipek.'}</span>
    </div>
  </section>;
}

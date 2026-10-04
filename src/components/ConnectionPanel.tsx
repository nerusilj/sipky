import { AUTH_BLOCKER } from '../autodarts/auth.ts';

export default function ConnectionPanel({ onConnect }: { onConnect: () => void }) {
  return <section className="connection card" aria-labelledby="connection-title">
    <div className="section-heading"><span className="eyebrow">01 / PŘIPOJENÍ</span><span className="badge amber">ČEKÁ NA REGISTRACI</span></div>
    <h2 id="connection-title">Nejprve vlastní přihlášení</h2>
    <p>{AUTH_BLOCKER}</p>
    <div className="connection-grid">
      <div><span className="field-label">API</span><code>api.autodarts.com</code></div>
      <div><span className="field-label">WebSocket</span><code>play.ws.autodarts.com</code></div>
      <div><span className="field-label">Terč</span><span className="muted">Zatím nevybraný</span></div>
    </div>
    <div className="connection-actions">
      <button className="primary" onClick={onConnect}><span aria-hidden="true">↗</span> Připojit</button>
      <button disabled>Odpojit</button>
      <span className="muted small">Připojení vysvětlí aktuální překážku. Síťové požadavky jsou pozastavené.</span>
    </div>
  </section>;
}

import { useState } from 'react';
import ConnectionPanel from '../components/ConnectionPanel.tsx';
import { boardConnection, useConnection } from '../connection.ts';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, setVenueName, useVenueName } from '../settings.ts';

export default function SettingsPage() {
  const connection = useConnection();
  const venueName = useVenueName();
  const [address, setAddress] = useState(connection.address);
  const [venueDraft, setVenueDraft] = useState(venueName);
  const [notice, setNotice] = useState('');
  function connect() {
    try { boardConnection.connect(address); setNotice(''); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Neplatná adresa terče.'); }
  }
  function saveVenue() { setVenueDraft(setVenueName(venueDraft)); }
  return <div className="page">
    <div className="page-heading"><div><h1>Nastavení</h1><p>Název podniku a připojení k Autodarts Board Manageru.</p></div></div>
    <section className="settings-card card" aria-labelledby="venue-title">
      <span className="eyebrow">PODNIK</span>
      <h2 id="venue-title">Název v horní liště</h2>
      <div className="settings-row">
        <input value={venueDraft} maxLength={MAX_VENUE_NAME} placeholder={DEFAULT_VENUE_NAME} aria-labelledby="venue-title"
          onChange={event => setVenueDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveVenue(); }} />
        <button className="primary" onClick={saveVenue} disabled={venueDraft.trim() === venueName}>Uložit</button>
      </div>
    </section>
    <ConnectionPanel address={address} state={connection.state} onAddress={setAddress} onConnect={connect} onDisconnect={() => boardConnection.disconnect()} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
  </div>;
}

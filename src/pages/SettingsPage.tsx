import { useState } from 'react';
import ConnectionPanel from '../components/ConnectionPanel.tsx';
import DartMark from '../components/DartMark.tsx';
import { boardConnection, useConnection } from '../connection.ts';
import { DART_THEMES } from '../dartThemes.ts';
import type { DartThemeId } from '../dartThemes.ts';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, setDartTheme, setVenueName, useDartTheme, useVenueName } from '../settings.ts';

const THEME_IDS = Object.keys(DART_THEMES) as DartThemeId[];

export default function SettingsPage() {
  const connection = useConnection();
  const venueName = useVenueName();
  const dartTheme = useDartTheme();
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
    <section className="settings-card card venue-card" aria-label="Horní lišta">
      <div className="venue-name">
        <span className="eyebrow">PODNIK</span>
        <h2 id="venue-title">Název v horní liště</h2>
        <div className="settings-row">
          <input value={venueDraft} maxLength={MAX_VENUE_NAME} placeholder={DEFAULT_VENUE_NAME} aria-labelledby="venue-title"
            onChange={event => setVenueDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveVenue(); }} />
          <button className="primary" onClick={saveVenue} disabled={venueDraft.trim() === venueName}>Uložit</button>
        </div>
      </div>
      <div className="venue-dart">
        <span className="eyebrow">ŠIPKA</span>
        <h2 id="dart-title">Šipka vedle názvu</h2>
        <div className="dart-options" role="radiogroup" aria-labelledby="dart-title">
          {THEME_IDS.map(id => <button key={id} role="radio" aria-checked={dartTheme === id} className={`dart-option ${dartTheme === id ? 'selected' : ''}`}
            onClick={() => setDartTheme(id)}><DartMark theme={id} width={96} /><span>{DART_THEMES[id].name}</span></button>)}
        </div>
      </div>
    </section>
    <ConnectionPanel address={address} state={connection.state} onAddress={setAddress} onConnect={connect} onDisconnect={() => boardConnection.disconnect()} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
  </div>;
}

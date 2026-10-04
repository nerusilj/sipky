import { useState } from 'react';
import ConnectionPanel from '../components/ConnectionPanel.tsx';
import DartMark from '../components/DartMark.tsx';
import { boardConnection, useConnection } from '../connection.ts';
import { DART_THEMES } from '../dartThemes.ts';
import type { DartThemeId } from '../dartThemes.ts';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, setCallerEnabled, setCallerVoice, setConfettiEnabled, setDartTheme, setEffectEnabled, setEffectsEnabled,
  setShowDev, setVenueName, useCallerEnabled, useCallerVoice, useConfettiEnabled, useDartTheme, useDisabledEffects, useEffectsEnabled, useShowDev,
  useVenueName } from '../settings.ts';
import { caller } from '../caller/caller.ts';
import { EFFECT_IDS, EFFECTS } from '../effects/effectRules.ts';
import { VOICES } from '../caller/voices.ts';
import type { VoiceId } from '../caller/voices.ts';

const VOICE_IDS = Object.keys(VOICES) as VoiceId[];

const THEME_IDS = Object.keys(DART_THEMES) as DartThemeId[];

export default function SettingsPage() {
  const connection = useConnection();
  const venueName = useVenueName();
  const dartTheme = useDartTheme();
  const callerEnabled = useCallerEnabled();
  const callerVoice = useCallerVoice();
  const effectsEnabled = useEffectsEnabled();
  const disabledEffects = useDisabledEffects();
  const confettiEnabled = useConfettiEnabled();
  const showDev = useShowDev();
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
    <section className="settings-card card" aria-labelledby="voice-title">
      <div className="caller-head">
        <div><span className="eyebrow">HLASATEL</span><h2 id="voice-title">Hlas hlášení</h2></div>
        <label className="switch"><input type="checkbox" checked={callerEnabled} onChange={event => setCallerEnabled(event.target.checked)} />
          <span>{callerEnabled ? 'Hlásit součet kola' : 'Hlášení vypnuto'}</span></label>
      </div>
      <div className="voice-options" role="radiogroup" aria-labelledby="voice-title">
        {VOICE_IDS.map(id => <div key={id} className={`voice-option ${callerVoice === id ? 'selected' : ''}`}>
          <button role="radio" aria-checked={callerVoice === id} className="voice-pick" onClick={() => setCallerVoice(id)}>
            <strong>{VOICES[id].name}</strong><span>{VOICES[id].kind}</span></button>
          <button className="text-button" onClick={() => void caller.play(180, id)} aria-label={`Ukázka hlasu ${VOICES[id].name}`}>▶ Ukázka</button>
        </div>)}
      </div>
      <p className="small muted">Hlasy: {VOICE_IDS.map(id => VOICES[id].credit).join(' · ')}.</p>
    </section>
    <section className="settings-card card" aria-labelledby="effects-title">
      <div className="caller-head">
        <div><span className="eyebrow">ZÁBAVA</span><h2 id="effects-title">Zábavné efekty</h2></div>
        <label className="switch"><input type="checkbox" checked={effectsEnabled} onChange={event => setEffectsEnabled(event.target.checked)} />
          <span>{effectsEnabled ? 'Efekty zapnuté' : 'Efekty vypnuté'}</span></label>
      </div>
      <ul className="effect-list">
        {EFFECT_IDS.map(id => <li key={id} className={effectsEnabled ? '' : 'muted-row'}>
          <label className="switch"><input type="checkbox" checked={!disabledEffects.includes(id)} disabled={!effectsEnabled}
            onChange={event => setEffectEnabled(id, event.target.checked)} /><strong>{EFFECTS[id].name}</strong></label>
          <span className="muted small">{EFFECTS[id].trigger}{EFFECTS[id].replacesScore ? ' · nahradí hlášení součtu' : ''}</span>
        </li>)}
        <li className={effectsEnabled ? '' : 'muted-row'}>
          <label className="switch"><input type="checkbox" checked={confettiEnabled} disabled={!effectsEnabled}
            onChange={event => setConfettiEnabled(event.target.checked)} /><strong>Konfety</strong></label>
          <span className="muted small">Po vyhraném legu, po vyhraném zápasu delší oslava</span>
        </li>
      </ul>
    </section>
    <section className="settings-card card" aria-labelledby="dev-title">
      <div className="caller-head">
        <div><span className="eyebrow">PRO VÝVOJÁŘE</span><h2 id="dev-title">Sekce DEV</h2></div>
        <label className="switch"><input type="checkbox" checked={showDev} onChange={event => setShowDev(event.target.checked)} />
          <span>{showDev ? 'Zobrazena v menu' : 'Skrytá'}</span></label>
      </div>
      <p className="small muted">Inspektor zpráv z terče, záznam na disk a kontrola hlášení a efektů.</p>
    </section>
    <ConnectionPanel address={address} state={connection.state} onAddress={setAddress} onConnect={connect} onDisconnect={() => boardConnection.disconnect()} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
  </div>;
}

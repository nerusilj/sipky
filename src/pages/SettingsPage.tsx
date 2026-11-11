import SegmentedControl from '../components/SegmentedControl.tsx';
import { useState } from 'react';
import packageInfo from '../../package.json';
import ConnectionPanel from '../components/ConnectionPanel.tsx';
import Toggle from '../components/Toggle.tsx';
import { ChevronDownIcon, PlayIcon } from '../components/Icons.tsx';
import { boardConnection, useConnection } from '../connection.ts';
import { DEFAULT_VENUE_NAME, MAX_VENUE_NAME, setCallerEnabled, setCallerVoice, setConfettiEnabled, setEffectEnabled, setEffectsEnabled,
  setShowDev, setVenueName, useCallerEnabled, useCallerVoice, useConfettiEnabled, useDisabledEffects, useEffectsEnabled, useShowDev,
  useVenueName, setSoundEnabled, useSoundEnabled } from '../settings.ts';
import { caller } from '../caller/caller.ts';
import { EFFECT_IDS, EFFECTS } from '../effects/effectRules.ts';
import { VOICES } from '../caller/voices.ts';
import type { VoiceId } from '../caller/voices.ts';
import { usePlayerSpeech } from '../caller/playerSpeech.ts';

const VOICE_IDS = Object.keys(VOICES) as VoiceId[];

export default function SettingsPage({ onGame }: { onGame?: () => void }) {
  const connection = useConnection();
  const venueName = useVenueName();
  const callerEnabled = useCallerEnabled();
  const soundEnabled = useSoundEnabled();
  const callerVoice = useCallerVoice();
  const playerSpeech = usePlayerSpeech();
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
  return <div className="page settings-page">
    <div className="page-heading"><div><h1>Nastavení</h1><p>Zvuk, efekty a připojení k terči.</p></div>
      {onGame && <button className="primary" onClick={onGame}>Zpět do hry</button>}</div>
    <section className="settings-card card" aria-labelledby="voice-title">
      <div className="caller-head">
        <div><span className="eyebrow">ZVUK</span><h2 id="voice-title">Zvuk a hlasatel</h2></div>
        <Toggle checked={soundEnabled} onChange={setSoundEnabled}>Zapnout zvuk</Toggle>
      </div>
      <Toggle checked={soundEnabled && callerEnabled} disabled={!soundEnabled} onChange={setCallerEnabled}>Zapnout hlasatele</Toggle>
      <div className="voice-options">
        <SegmentedControl label="Hlas hlasatele" value={callerVoice} onChange={setCallerVoice}
          options={VOICE_IDS.map(id => ({ value: id, label: <span className="segmented-caption"><strong>{VOICES[id].name}</strong><small>{VOICES[id].kind}</small></span> }))} />
        <div className="voice-previews">{VOICE_IDS.map(id => <button key={id} className="text-button" onClick={() => void caller.play(180, id)} aria-label={`Ukázka hlasu ${VOICES[id].name}`}><PlayIcon size={16} />Ukázka {VOICES[id].name}</button>)}</div>
      </div>
      <p className="small muted">Hlásí skóre a jméno hráče na řadě.</p>
      {playerSpeech.pending > 0 && <p className="small muted" role="status">Připravuji hlášení jmen ({playerSpeech.pending})…</p>}
      {playerSpeech.error && <p className="field-error" role="alert">{playerSpeech.error}</p>}
    </section>
    <section className="settings-card card" aria-labelledby="effects-title">
      <div className="caller-head">
        <div><span className="eyebrow">ZÁBAVA</span><h2 id="effects-title">Zábavné efekty</h2></div>
        <Toggle checked={effectsEnabled} onChange={setEffectsEnabled}>Zapnout efekty</Toggle>
      </div>
      <ul className="effect-list">
        {EFFECT_IDS.map(id => <li key={id} className={effectsEnabled ? '' : 'muted-row'}>
          <Toggle checked={!disabledEffects.includes(id)} disabled={!effectsEnabled} onChange={value => setEffectEnabled(id, value)}>
            <strong>{EFFECTS[id].name}</strong></Toggle>
          <span className="muted small">{EFFECTS[id].trigger}{EFFECTS[id].replacesScore ? ' · nahradí hlášení součtu' : ''}</span>
        </li>)}
        <li className={effectsEnabled ? '' : 'muted-row'}>
          <Toggle checked={confettiEnabled} disabled={!effectsEnabled} onChange={setConfettiEnabled}><strong>Konfety a potlesk</strong></Toggle>
          <span className="muted small">Při každém platném zavření, u každého hráče</span>
        </li>
      </ul>
    </section>
    <ConnectionPanel address={address} state={connection.state} onAddress={setAddress} onConnect={connect} onDisconnect={() => boardConnection.disconnect()} />
    <details className="settings-disclosure card"><summary><span>Obecné</span><ChevronDownIcon size={20} /></summary><div className="settings-disclosure-body">
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
    </section>
    </div></details>
    <details className="settings-disclosure card"><summary><span>Pokročilé a informace o aplikaci</span><ChevronDownIcon size={20} /></summary><div className="settings-disclosure-body">
    <section className="settings-card card" aria-labelledby="dev-title">
      <div className="caller-head">
        <div><span className="eyebrow">PRO VÝVOJÁŘE</span><h2 id="dev-title">Sekce DEV</h2></div>
        <Toggle checked={showDev} onChange={setShowDev}>Zobrazit v menu</Toggle>
      </div>
      <p className="small muted">Inspektor zpráv z terče, záznam na disk a kontrola hlášení a efektů.</p>
    </section>
      <div className="app-information"><strong>Šipky · verze {packageInfo.version}</strong><p>Hlasy: {VOICE_IDS.map(id => VOICES[id].credit).join(' · ')}.</p></div>
    </div></details>
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
  </div>;
}

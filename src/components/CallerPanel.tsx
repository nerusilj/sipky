import { useState } from 'react';
import { caller, useCaller } from '../caller/caller.ts';
import { MAX_VISIT_SCORE, scoreAnnouncement } from '../caller/czechNumbers.ts';
import { VOICES } from '../caller/voices.ts';
import { EFFECT_IDS, EFFECTS } from '../effects/effectRules.ts';
import { triggerEffect } from '../effects/effects.ts';
import { useCallerEnabled, useCallerVoice } from '../settings.ts';

const QUICK = [180, 140, 100, 60, 45, 26, 0];

export default function CallerPanel() {
  const state = useCaller();
  const enabled = useCallerEnabled();
  const voice = useCallerVoice();
  const [value, setValue] = useState('100');
  const total = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(total) && total >= 0 && total <= MAX_VISIT_SCORE;
  return <section className="caller card" aria-labelledby="caller-title">
    <div className="caller-head">
      <div><span className="eyebrow">HLASATEL</span><h2 id="caller-title">Kontrola hlášení</h2></div>
      <span className="muted small">Hlas {VOICES[voice].name} · {enabled ? 'hlášení zapnuto' : 'hlášení vypnuto'} · změna v Nastavení</span>
    </div>
    <div className="caller-controls">
      <input type="number" min={0} max={MAX_VISIT_SCORE} step={1} value={value} aria-label="Součet kola"
        onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && valid) void caller.play(total); }} />
      <button className="primary" disabled={!valid} onClick={() => void caller.play(total)}>▶ Přehrát</button>
      <span className="muted small">{valid ? `„${scoreAnnouncement(total)}“` : `Zadejte 0–${MAX_VISIT_SCORE}`}</span>
      <span className="spacer"></span>
      {state.sequence ? <button onClick={() => caller.stop()}>■ Zastavit</button>
        : <button onClick={() => void caller.playRange(0, MAX_VISIT_SCORE)}>Přehrát vše 0–{MAX_VISIT_SCORE}</button>}
    </div>
    <div className="caller-quick">{QUICK.map(n => <button key={n} className={state.playing === String(n) ? 'playing' : ''} onClick={() => void caller.play(n)}>{n}</button>)}</div>
    <div className="caller-effects">
      <span className="field-label">EFEKTY</span>
      {EFFECT_IDS.map(id => <span key={id} className="caller-effect">
        <strong>{EFFECTS[id].name}</strong><span className="muted small">{EFFECTS[id].trigger}</span>
        <button onClick={() => triggerEffect(id)}>▶ Efekt s hláškou</button>
        <button onClick={() => void caller.playPhrase(EFFECTS[id].phrase)}>Jen hláška</button>
      </span>)}
    </div>
    {state.playing !== undefined && <p className="small muted">Hraje: {state.playing}</p>}
    {state.error && <div className="notice" role="status"><span>{state.error}</span></div>}
    <div className="caller-log">
      <span className="field-label">OHLÁŠENÁ KOLA Z TERČE</span>
      {state.log.length ? <ol>{state.log.map(visit => <li key={visit.at}>
        <time>{new Date(visit.at).toLocaleTimeString('cs-CZ', { hour12: false })}</time>
        <span className="caller-darts">{visit.darts.map(dart => dart.name).join(' · ')}{visit.effect && <em> · {visit.effect}</em>}</span>
        <strong>{visit.total}</strong>
        <button className="text-button" onClick={() => void caller.play(visit.total)} aria-label={`Přehrát ${visit.total}`}>▶</button>
      </li>)}</ol> : <p className="small muted">Zatím žádné kolo. Po třetí šipce nebo vytažení šipek se tu objeví součet.</p>}
    </div>
  </section>;
}

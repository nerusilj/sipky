import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import EventLog from '../components/EventLog.tsx';
import EventDetails from '../components/EventDetails.tsx';
import CallerPanel from '../components/CallerPanel.tsx';
import Filters from '../components/Filters.tsx';
import { STATE_LABELS } from '../components/ConnectionPanel.tsx';
import { boardConnection, useConnection, useRecorder } from '../connection.ts';
import { filterMessages, messageStore, MAX_MESSAGES } from '../inspector/messageStore.ts';
import { saveSession } from '../inspector/saveSession.ts';
import type { StoredMessage } from '../inspector/types.ts';

export default function DevPage({ onSettings }: { onSettings: () => void }) {
  const connection = useConnection();
  const recording = useRecorder();
  const [messages, setMessages] = useState<readonly StoredMessage[]>([]);
  const [stats, setStats] = useState(messageStore.stats());
  const [paused, setPaused] = useState(false);
  const [channel, setChannel] = useState('');
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const revision = useRef(-1);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (paused) return;
    const refresh = () => {
      const next = messageStore.stats();
      if (next.revision !== revision.current) {
        revision.current = next.revision;
        setMessages(messageStore.snapshot()); setStats(next);
      }
    };
    refresh(); const timer = window.setInterval(refresh, 200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const channels = useMemo(() => [...new Set(messages.flatMap(message => message.channel ? [message.channel] : []))].sort(), [messages]);
  const filtered = useMemo(() => [...filterMessages(messages, channel, deferredSearch, direction)].reverse(), [messages, channel, deferredSearch, direction]);
  const selected = useMemo(() => messages.find(message => message.id === selectedId), [messages, selectedId]);
  const select = useCallback((id: number) => setSelectedId(id), []);
  const active = connection.state !== 'disconnected';
  function connect() {
    try { boardConnection.connect(); setNotice(''); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Neplatná adresa terče.'); }
  }
  function clear() {
    messageStore.clear(); setMessages([]); setStats(messageStore.stats()); setSelectedId(undefined); setPage(0);
  }
  async function save() {
    if (!messageStore.stats().count) { setNotice('Buffer je prázdný. Není co uložit.'); return; }
    setSaving(true); setNotice('');
    try {
      // Exportuje aktuální buffer včetně zpráv přijatých při pozastaveném pohledu.
      const saved = await saveSession(messageStore.snapshot());
      if (saved) setNotice('Záznam byl uložen jako JSONL.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Uložení záznamu selhalo.'); }
    finally { setSaving(false); }
  }
  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow orange">DEV · POZOROVAT. ZAZNAMENAT. POROZUMĚT.</span><h1>Inspektor událostí</h1><p>Surové zprávy z Board Manageru beze změny a bez interpretace.</p></div>
      <div className="readonly"><span aria-hidden="true">◈</span><div><strong>Pouze čtení</strong><span>Bez zásahů do terče a hry</span></div></div>
    </div>
    <div className="dev-connection card">
      <span className={`dot ${connection.state === 'connected' ? '' : 'amber-dot'}`}></span>
      <strong>{STATE_LABELS[connection.state]}</strong><code>ws://{connection.address}/api/events</code>
      <span className="spacer"></span>
      <button onClick={onSettings} className="text-button">Změnit adresu</button>
      {active ? <button onClick={() => boardConnection.disconnect()}>Odpojit</button> : <button className="primary" onClick={connect}>Připojit</button>}
    </div>
    <div className={`recording card ${recording.error || recording.lost ? 'failing' : ''}`}>
      <span className={`rec-dot ${recording.enabled && !recording.error ? 'on' : ''}`} aria-hidden="true"></span>
      {!recording.enabled ? <span className="muted">Průběžný záznam na disk běží jen v desktopové aplikaci.</span> : <>
        <strong>Záznam na disk</strong>
        <code>{recording.path ?? `…/Sipky/zaznamy/${recording.session}.jsonl`}</code>
        <span className="spacer"></span>
        <span className="muted">zapsáno {recording.written.toLocaleString('cs-CZ')} řádků{recording.pending ? ` · čeká ${recording.pending.toLocaleString('cs-CZ')}` : ''}</span>
      </>}
      {recording.error && <span className="rec-error">Zápis selhává: {recording.error} Řádky čekají ve frontě.</span>}
      {recording.lost > 0 && <span className="rec-error">Fronta byla plná, {recording.lost.toLocaleString('cs-CZ')} řádků se nezapsalo.</span>}
    </div>
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
    <div className="metrics"><div><span className="field-label">ZPRÁVY V BUFFERU</span><strong>{stats.count.toLocaleString('cs-CZ')}<small> / {MAX_MESSAGES.toLocaleString('cs-CZ')}</small></strong></div>
      <div><span className="field-label">PŘIJATO OD VYMAZÁNÍ</span><strong>{stats.received.toLocaleString('cs-CZ')}</strong></div>
      <div><span className="field-label">VYŘAZENO Z BUFFERU</span><strong>{stats.dropped.toLocaleString('cs-CZ')}</strong></div>
      <div><span className="field-label">POHLED</span><strong className="view-state"><span className={`dot ${paused ? 'amber-dot' : ''}`}></span>{paused ? 'Pozastavený' : 'Průběžný'}</strong></div>
    </div>
    <section className="inspector card" aria-labelledby="inspector-title">
      <div className="inspector-toolbar"><div><span className="eyebrow">ZÁZNAM</span><h2 id="inspector-title">Provoz pod lupou</h2></div><div className="toolbar-actions">
        <button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶ Obnovit pohled' : 'Ⅱ Pozastavit pohled'}</button>
        <button onClick={clear}>Vymazat</button><button className="save" onClick={() => { void save(); }} disabled={saving}>{saving ? 'Ukládání…' : '↓ Uložit relaci'}</button>
      </div></div>
      {paused && <div className="pause-note">Pohled je zmrazený. Příjem pokračuje, pokud je terč připojen. Export zahrnuje aktuální buffer.</div>}
      <Filters channels={channels} channel={channel} direction={direction} search={search} onChannel={v => {setChannel(v);setPage(0);}} onDirection={v => {setDirection(v);setPage(0);}} onSearch={v => {setSearch(v);setPage(0);}} />
      <div className="split"><EventLog messages={filtered} hasCaptured={messages.length > 0} page={page} selectedId={selectedId} onPage={setPage} onSelect={select} /><EventDetails message={selected} /></div>
    </section>
    <CallerPanel />
    <footer><span><span className="orange">●</span> Záznam celých obálek · JSONL · Časy s milisekundami</span><span>Zdroj: lokální Board Manager · pouze čtení</span></footer>
  </div>;
}

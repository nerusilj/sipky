import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_BOARD_ADDRESS } from './autodarts/boardAddress.ts';
import { LocalBoardClient } from './autodarts/LocalBoardClient.ts';
import type { ConnectionState } from './autodarts/types.ts';
import ConnectionPanel, { STATE_LABELS } from './components/ConnectionPanel.tsx';
import EventLog from './components/EventLog.tsx';
import EventDetails from './components/EventDetails.tsx';
import Filters from './components/Filters.tsx';
import { filterMessages, messageStore, MAX_MESSAGES } from './inspector/messageStore.ts';
import { saveSession } from './inspector/saveSession.ts';
import type { StoredMessage } from './inspector/types.ts';

const ADDRESS_KEY = 'darts-cz.boardAddress';
function storedAddress(): string {
  try { return localStorage.getItem(ADDRESS_KEY) || DEFAULT_BOARD_ADDRESS; } catch { return DEFAULT_BOARD_ADDRESS; }
}

export default function App() {
  const [address, setAddress] = useState(storedAddress);
  const [connection, setConnection] = useState<ConnectionState>('disconnected');
  const client = useRef<LocalBoardClient>(undefined);
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

  useEffect(() => () => client.current?.disconnect(), []);
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
  function connect() {
    let next: LocalBoardClient;
    try { next = new LocalBoardClient(address); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Neplatná adresa terče.'); return; }
    client.current?.disconnect();
    client.current = next; setNotice('');
    next.onState(setConnection);
    next.onMessage(message => messageStore.append(message));
    next.connect();
    try { localStorage.setItem(ADDRESS_KEY, address.trim()); } catch { /* Adresa se jen nezapamatuje. */ }
  }
  function disconnect() {
    client.current?.disconnect(); client.current = undefined;
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
  return <>
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark" aria-hidden="true">↗</span><span>DARTS <b>CZ</b></span></a>
      <span className="app-tag">VÝVOJOVÁ LABORATOŘ <span>v0.1</span></span>
      <div className="connection-indicator"><span className={`dot ${connection === 'connected' ? '' : 'amber-dot'}`}></span> Terč <strong>{STATE_LABELS[connection]}</strong></div>
    </header>
    <main>
      <div className="hero"><div><span className="eyebrow orange">POZOROVAT. ZAZNAMENAT. POROZUMĚT.</span><h1>Autodarts <span>WS Lab</span><span className="hero-period">.</span></h1><p>Inspektor surových zpráv. První krok k Darts CZ.</p></div>
        <div className="readonly"><span aria-hidden="true">◈</span><div><strong>Pouze čtení</strong><span>Bez zásahů do zápasu</span></div></div>
      </div>
      <ConnectionPanel address={address} state={connection} onAddress={setAddress} onConnect={connect} onDisconnect={disconnect} />
      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
      <div className="metrics"><div><span className="field-label">ZPRÁVY V BUFFERU</span><strong>{stats.count.toLocaleString('cs-CZ')}<small> / {MAX_MESSAGES.toLocaleString('cs-CZ')}</small></strong></div>
        <div><span className="field-label">PŘIJATO OD VYMAZÁNÍ</span><strong>{stats.received.toLocaleString('cs-CZ')}</strong></div>
        <div><span className="field-label">VYŘAZENO Z BUFFERU</span><strong>{stats.dropped.toLocaleString('cs-CZ')}</strong></div>
        <div><span className="field-label">POHLED</span><strong className="view-state"><span className={`dot ${paused ? 'amber-dot' : ''}`}></span>{paused ? 'Pozastavený' : 'Průběžný'}</strong></div>
      </div>
      <section className="inspector card" aria-labelledby="inspector-title">
        <div className="inspector-toolbar"><div><span className="eyebrow">02 / ZÁZNAM</span><h2 id="inspector-title">Provoz pod lupou</h2></div><div className="toolbar-actions">
          <button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶ Obnovit pohled' : 'Ⅱ Pozastavit pohled'}</button>
          <button onClick={clear}>Vymazat</button><button className="save" onClick={() => { void save(); }} disabled={saving}>{saving ? 'Ukládání…' : '↓ Uložit relaci'}</button>
        </div></div>
        {paused && <div className="pause-note">Pohled je zmrazený. Příjem pokračuje, pokud je klient připojen. Export zahrnuje aktuální buffer.</div>}
        <Filters channels={channels} channel={channel} direction={direction} search={search} onChannel={v => {setChannel(v);setPage(0);}} onDirection={v => {setDirection(v);setPage(0);}} onSearch={v => {setSearch(v);setPage(0);}} />
        <div className="split"><EventLog messages={filtered} hasCaptured={messages.length > 0} page={page} selectedId={selectedId} onPage={setPage} onSelect={select} /><EventDetails message={selected} /></div>
      </section>
      <footer><span><span className="orange">●</span> Záznam celých obálek · JSONL · Časy s milisekundami</span><span>Zdroj: lokální Board Manager · pouze čtení</span></footer>
    </main>
  </>;
}

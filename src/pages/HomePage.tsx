import { useEffect, useState } from 'react';
import { STATE_LABELS } from '../components/ConnectionPanel.tsx';
import { ChevronIcon, TargetArt } from '../components/Icons.tsx';
import { useConnection } from '../connection.ts';

const MODES = [
  { id: 'x301', title: '301', subtitle: 'Classic' },
  { id: 'x501', title: '501', subtitle: 'Classic' },
  { id: 'cricket', title: 'Cricket', subtitle: 'Zavírání čísel' },
] as const;

export function sinceText(at: number | undefined, now: number): string {
  if (at === undefined) return 'zatím žádná';
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `před ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `před ${minutes} min` : `před ${Math.round(minutes / 60)} h`;
}

export default function HomePage() {
  const connection = useConnection();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const online = connection.state === 'connected';
  return <div className="page">
    <div className="page-heading"><div><h1>Vítejte v Darts CZ</h1><p>Vyberte herní mód a začněte hrát.</p></div></div>
    <div className="modes">
      {MODES.map(mode => <button key={mode.id} className={`mode-tile ${mode.id}`} disabled title="Herní režimy přijdou v další verzi">
        <TargetArt /><strong>{mode.title}</strong><span>{mode.subtitle}</span>
        <span className="mode-soon">PŘIPRAVUJEME</span><span className="mode-chevron"><ChevronIcon size={18} /></span>
      </button>)}
    </div>
    <section className="status-card card" aria-labelledby="status-title">
      <div>
        <h2 id="status-title">Autodarts</h2>
        <span className={`status-line ${online ? 'online' : ''}`}><span className={`dot ${online ? '' : 'amber-dot'}`}></span>{STATE_LABELS[connection.state]}</span>
        <dl>
          <dt>Board</dt><dd><code>{connection.address}</code></dd>
          <dt>Stav</dt><dd>{online ? 'Online' : 'Offline'}</dd>
          <dt>Poslední událost</dt><dd>{sinceText(connection.lastMessageAt, now)}</dd>
        </dl>
      </div>
      <div className={`status-target ${online ? 'online' : ''}`}><TargetArt /></div>
    </section>
  </div>;
}

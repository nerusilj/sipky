import { useEffect, useState } from 'react';
import AutodartsLogo from '../components/AutodartsLogo.tsx';
import { STATE_LABELS } from '../components/ConnectionPanel.tsx';
import { ChevronIcon, TileBoard } from '../components/Icons.tsx';
import { useConnection } from '../connection.ts';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import { usePlayers } from '../players/players.ts';

const RECENT_PLAYERS = 5;

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

export default function HomePage({ onPlayers }: { onPlayers: () => void }) {
  const connection = useConnection();
  const { players } = usePlayers();
  // Zatím bez her: „poslední“ = naposledy přidaní.
  const recent = [...players].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT_PLAYERS);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const online = connection.state === 'connected';
  return <div className="page">
    <div className="page-heading"><div><h1>Vítejte u šipek</h1><p>Vyberte herní mód a začněte hrát.</p></div></div>
    <div className="modes">
      {MODES.map(mode => <button key={mode.id} className={`mode-tile ${mode.id}`} disabled title="Herní režimy přijdou v další verzi">
        <TileBoard /><strong>{mode.title}</strong><span>{mode.subtitle}</span>
        <span className="mode-soon">PŘIPRAVUJEME</span><span className="mode-chevron"><ChevronIcon size={18} /></span>
      </button>)}
    </div>
    <section className="status-card card" aria-labelledby="status-title">
      <div>
        <h2 id="status-title">Autodarts</h2>
        <span className={`status-line ${online ? 'online' : ''}`}><span className={`dot ${online ? '' : 'amber-dot'}`}></span>{STATE_LABELS[connection.state]}</span>
        <dl>
          <dt>Board</dt><dd><code>{connection.address}</code></dd>
          <dt>Verze Board Manageru</dt><dd>{connection.version ?? (online ? 'zjišťuji…' : '—')}</dd>
          <dt>Stav</dt><dd>{online ? 'Online' : 'Offline'}</dd>
          <dt>Poslední událost</dt><dd>{sinceText(connection.lastMessageAt, now)}</dd>
        </dl>
      </div>
      <AutodartsLogo className={`status-logo ${online ? 'online' : ''}`} />
    </section>
    <section className="recent-players" aria-labelledby="recent-title">
      <div className="recent-head"><h2 id="recent-title">Poslední hráči</h2>
        {players.length > 0 && <button className="text-button" onClick={onPlayers}>Všichni hráči ›</button>}</div>
      <div className="recent-list">
        {recent.map(player => <button key={player.id} className="recent-player card" onClick={onPlayers}>
          <PlayerAvatar player={player} size={58} /><strong>{player.name}</strong></button>)}
        <button className="recent-player add card" onClick={onPlayers}><span className="add-icon" aria-hidden="true">+</span><strong>Přidat hráče</strong></button>
      </div>
    </section>
  </div>;
}

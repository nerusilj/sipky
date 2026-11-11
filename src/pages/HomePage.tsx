import type { GameMode } from '../game/activeGame.ts';
import { useEffect, useState } from 'react';
import AutodartsLogo from '../components/AutodartsLogo.tsx';
import { STATE_LABELS } from '../components/ConnectionPanel.tsx';
import { ChevronIcon, TileBoard } from '../components/Icons.tsx';
import { useConnection } from '../connection.ts';
import { isVerifiedBoardVersion, VERIFIED_BOARD_VERSIONS } from '../autodarts/boardVersion.ts';

const MODES = [
  { id: 'x01', title: 'X01', subtitle: 'Odpočítávání do nuly', available: true },
  { id: 'cricket', title: 'Cricket', subtitle: 'Zavírání čísel a bodování', available: true },
] as const;

export function sinceText(at: number | undefined, now: number): string {
  if (at === undefined) return 'zatím žádná';
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `před ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `před ${minutes} min` : `před ${Math.round(minutes / 60)} h`;
}

export default function HomePage({ onPlay }: { onPlay: (mode: GameMode) => void }) {
  const connection = useConnection();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const online = connection.state === 'connected';
  const version = connection.version;
  const supported = version !== undefined && isVerifiedBoardVersion(version);
  const versionStatus = connection.versionLoading ? 'Zjišťuji verzi…' : 'Verzi nelze zjistit';
  return <div className="page">
    <div className="page-heading"><div><h1>Vítejte u šipek</h1><p>Vyberte herní mód a začněte hrát.</p></div></div>
    <div className="modes">
      {MODES.map(mode => <button key={mode.id} className={`mode-tile ${mode.id}`} disabled={!mode.available}
        title={mode.available ? `Nová hra ${mode.title}` : 'Připravujeme'} onClick={() => { if (mode.available) onPlay(mode.id); }}>
        <TileBoard /><strong>{mode.title}</strong><span>{mode.subtitle}</span>
        {!mode.available && <span className="mode-soon">PŘIPRAVUJEME</span>}<span className="mode-chevron"><ChevronIcon size={18} /></span>
      </button>)}
    </div>
    <details className="home-connection card">
      <summary>
        <span><strong>Autodarts</strong><span className={`status-line ${online ? 'online' : ''}`}><span className={`dot ${online ? '' : 'amber-dot'}`} />{STATE_LABELS[connection.state]}</span>
          {online && <span className="home-board-version">
            {version ? <><span title="Verze Board Manageru">{version}</span>
              <span className={`badge ${supported ? 'board-version-supported' : 'amber'}`}>{supported ? 'Podporovaná verze' : 'Podpora neověřena'}</span></>
              : <span className={connection.versionLoading ? 'muted' : 'badge amber'}>{versionStatus}</span>}
          </span>}
        </span>
        <span className="connection-expand">Podrobnosti <ChevronIcon size={18} /></span>
      </summary>
    <section className="status-card" aria-labelledby="status-title">
      <div>
        <h2 id="status-title" className="sr-only">Podrobnosti připojení Autodarts</h2>
        <dl>
          <dt>Board</dt><dd><code>{connection.address}</code></dd>
          <dt>Verze Board Manageru</dt><dd>{version ?? (online ? versionStatus : '—')}</dd>
          <dt>Ověřené verze</dt><dd>{VERIFIED_BOARD_VERSIONS.join(' · ')}</dd>
          <dt>Stav</dt><dd>{online ? 'Online' : 'Offline'}</dd>
          <dt>Poslední událost</dt><dd>{sinceText(connection.lastMessageAt, now)}</dd>
        </dl>
      </div>
      <AutodartsLogo className={`status-logo ${online ? 'online' : ''}`} />
    </section>
    </details>
  </div>;
}

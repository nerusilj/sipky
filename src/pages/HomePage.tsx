import type { GameMode } from '../game/activeGame.ts';
import { useEffect, useId, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import AutodartsLogo from '../components/AutodartsLogo.tsx';
import { STATE_LABELS } from '../components/ConnectionPanel.tsx';
import { ChevronIcon, EjectIcon, PlayIcon, StopIcon, TileBoard } from '../components/Icons.tsx';
import { boardConnection, useConnection } from '../connection.ts';
import type { BoardCommand } from '../connection.ts';
import { isVerifiedBoardVersion, VERIFIED_BOARD_VERSIONS } from '../autodarts/boardVersion.ts';
import { boardStartStopAction, boardStatusDisplay } from '../autodarts/boardStatus.ts';
import type { useAppUpdate } from '../appUpdate.ts';
import AppUpdatePanel from '../components/AppUpdatePanel.tsx';
import { useAutodartsEnabled } from '../settings.ts';

const MODES = [
  { id: 'x01', title: 'X01', subtitle: 'Odpočítávání do nuly', available: true },
  { id: 'cricket', title: 'Cricket', subtitle: 'Zavírání čísel a bodování', available: true },
] as const;

const BOARD_COMMANDS = {
  start: { label: 'Start', title: 'Spustit detekci hodů', Icon: PlayIcon },
  stop: { label: 'Stop', title: 'Zastavit detekci hodů', Icon: StopIcon },
  reset: { label: 'Reset', title: 'Vymazat rozpoznané šipky a ukončit čekání na jejich vytažení', Icon: EjectIcon },
} satisfies Record<BoardCommand, { label: string; title: string; Icon: typeof PlayIcon }>;

export function sinceText(at: number | undefined, now: number): string {
  if (at === undefined) return 'zatím žádná';
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `před ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `před ${minutes} min` : `před ${Math.round(minutes / 60)} h`;
}

export default function HomePage({ onPlay, update, gameRunning }: {
  onPlay: (mode: GameMode) => void;
  update: ReturnType<typeof useAppUpdate>;
  gameRunning: boolean;
}) {
  const connection = useConnection();
  const autodartsEnabled = useAutodartsEnabled();
  const [now, setNow] = useState(Date.now());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const online = connection.state === 'connected';
  const version = connection.version;
  const supported = version !== undefined && isVerifiedBoardVersion(version);
  const versionStatus = connection.versionLoading ? 'Zjišťuji verzi…' : 'Verzi nelze zjistit';
  const status = connection.boardStatus ? boardStatusDisplay(connection.boardStatus) : undefined;
  const startStop = boardStartStopAction(connection.boardStatus);
  const unavailable = !online || !!connection.commandPending || !isTauri();
  const commandResult = connection.commandResult;

  return <div className="page">
    <div className="page-heading"><div><h1>Vítejte u šipek</h1><p>Vyberte herní mód a začněte hrát.</p></div></div>
    <div className="modes">
      {MODES.map(mode => <button key={mode.id} className={`mode-tile ${mode.id}`} disabled={!mode.available || update.installing}
        title={mode.available ? `Nová hra ${mode.title}` : 'Připravujeme'} onClick={() => { if (mode.available) onPlay(mode.id); }}>
        <TileBoard /><strong>{mode.title}</strong><span>{mode.subtitle}</span>
        {!mode.available && <span className="mode-soon">PŘIPRAVUJEME</span>}<span className="mode-chevron"><ChevronIcon size={18} /></span>
      </button>)}
    </div>
    {autodartsEnabled && <section className="home-connection card" aria-label="Autodarts">
      <div className="home-board-row">
        <div className="home-board-info"><strong>Autodarts</strong><span className={`status-line ${online ? 'online' : ''}`}><span className={`dot ${online ? '' : 'amber-dot'}`} />{STATE_LABELS[connection.state]}</span>
          {online && <span className="home-board-version">
            {version ? <><span title="Verze Board Manageru">{version}</span>
              <span className={`badge ${supported ? 'board-version-supported' : 'amber'}`}>{supported ? 'Podporovaná verze' : 'Podpora neověřena'}</span></>
              : <span className={connection.versionLoading ? 'muted' : 'badge amber'}>{versionStatus}</span>}
          </span>}
          {online && status && <span className="board-detection-status" data-tone={status.tone} title={connection.boardStatus}>{status.label}</span>}
        </div>
        <div className="home-board-actions">
          <div className="board-command-buttons" role="group" aria-label="Ovládání detekce Autodarts">
            {([startStop, 'reset'] as const).map(action => {
              const { label, title, Icon } = BOARD_COMMANDS[action];
              return <button key={action === 'reset' ? 'reset' : 'start-stop'} type="button"
                title={title} disabled={unavailable} onClick={() => void boardConnection.controlBoard(action)}>
                <Icon size={16} />{label}
              </button>;
            })}
          </div>
          <button type="button" className="connection-expand text-button" aria-expanded={detailsOpen} aria-controls={detailsId}
            onClick={() => setDetailsOpen(open => !open)}>Podrobnosti <ChevronIcon size={18} /></button>
        </div>
      </div>
      <div role="status" className={`board-command-result${commandResult?.error ? ' board-command-error' : ''}`}>
        {connection.commandPending ? `Odesílám ${BOARD_COMMANDS[connection.commandPending].label}…`
          : commandResult && (commandResult.error ?? `Autodarts přijal příkaz ${BOARD_COMMANDS[commandResult.action].label}.`)}
      </div>
      <div id={detailsId} hidden={!detailsOpen}>
        <div className="status-card">
          <div>
            <dl>
              <dt>Board</dt><dd><code>{connection.address}</code></dd>
              <dt>Verze Board Manageru</dt><dd>{version ?? (online ? versionStatus : '—')}</dd>
              <dt>Ověřené verze</dt><dd>{VERIFIED_BOARD_VERSIONS.join(' · ')}</dd>
              <dt>Stav</dt><dd>{online ? 'Online' : 'Offline'}</dd>
              <dt>Stav detekce</dt><dd>{connection.boardStatus ?? '—'}</dd>
              <dt>Poslední událost</dt><dd>{sinceText(connection.lastMessageAt, now)}</dd>
            </dl>
          </div>
          <AutodartsLogo className={`status-logo ${online ? 'online' : ''}`} />
        </div>
      </div>
    </section>}
    <AppUpdatePanel update={update} gameRunning={gameRunning} />
  </div>;
}

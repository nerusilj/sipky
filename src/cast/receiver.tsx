import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import PlayerName from '../components/PlayerName.tsx';
import type { BoardStatusDisplay } from '../autodarts/boardStatus.ts';
import Dartboard from '../components/Dartboard.tsx';
import BullOffArena, { BullOffResults } from '../components/BullOffArena.tsx';
import { X01PlayerCard, X01Visit } from '../components/X01Scoreboard.tsx';
import { CricketScoreboard, CricketVisit } from '../components/CricketScoreboard.tsx';
import { TrophyIcon } from '../components/Icons.tsx';
import { legsText } from '../game/x01Presentation.ts';
import { gamePanelLayout } from '../game/panelLayout.ts';
import Confetti from '../components/Confetti.tsx';
import { EffectVisual } from '../components/EffectOverlay.tsx';
import { showConfetti } from '../effects/confetti.ts';
import type { GamePlayer } from '../game/x01.ts';
import { CAST_NAMESPACE, CAST_PROTOCOL, readCastMessage } from './protocol.ts';
import type { CastSnapshot } from './protocol.ts';
import tvWordmark from './tv-wordmark.png';
import '../styles.css';
import './receiver.css';

interface ReceiverContext {
  addCustomMessageListener(namespace: string, listener: (event: { data: unknown; senderId: string }) => void): void;
  sendCustomMessage(namespace: string, senderId: string, message: object): void;
  addEventListener(event: string, listener: (event: { senderId: string }) => void): void;
  start(options: { disableIdleTimeout: boolean; customNamespaces: Record<string, string> }): void;
}

interface ReceiverFramework {
  CastReceiverContext: { getInstance(): ReceiverContext };
  system: { MessageType: { JSON: string }; EventType: { SENDER_DISCONNECTED: string } };
}

function Winner({ player }: { player: GamePlayer }) {
  return <section className="winner-panel card" role="status">
    <div className="winner-heading">
      <span className="winner-trophy"><TrophyIcon size={30} /></span>
      <div><span className="eyebrow">VÍTĚZ ZÁPASU</span><h2><PlayerName {...player} avatarSeed={player.id} avatarSize={40} /></h2></div>
    </div>
  </section>;
}

function AutodartsStatus({ status }: { status: BoardStatusDisplay }) {
  return <div className="tv-autodarts card" role="status">
    <span>Autodarts</span>
    <strong className="board-detection-status" data-tone={status.tone}>{status.label}</strong>
  </div>;
}

function TvBrand() {
  return <span className="tv-brand">
    <img src={tvWordmark} alt="Šipky TV" />
    <svg viewBox="0 0 72 68" fill="none" stroke="currentColor" strokeWidth="4.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="65" height="46" rx="8" />
      <path d="M36 50v12M23 62h26" />
    </svg>
  </span>;
}

type X01PlayersDisplay = Extract<NonNullable<CastSnapshot['game']>, { mode: 'x01' }>['players'];

function X01Players({ players }: { players: X01PlayersDisplay }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1796, height: 900 });
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const layout = gamePanelLayout(size.width, size.height);
  // V TV zobrazení musí zůstat všichni hráči viditelní i bez posouvání.
  const columns = Math.max(1, Math.ceil(players.length / 2), Math.min(layout.columns, players.length));
  const tileWidth = columns > layout.columns ? Math.floor((size.width - 14 * (columns - 1)) / columns) : layout.tileWidth;
  const style = {
    '--game-columns': columns,
    '--game-tile-width': `${tileWidth}px`,
    '--game-tile-height': `${layout.tileHeight}px`,
    '--game-score-size': `${layout.scoreSize}px`,
  } as CSSProperties;
  return <div className="tv-player-viewport" ref={viewport}>
    <div className="game-players tv-players" style={style}>
      {players.map(score => <X01PlayerCard key={score.player.id} score={score} />)}
    </div>
  </div>;
}

function Scoreboard({ snapshot }: { snapshot?: CastSnapshot }) {
  const game = snapshot?.game;
  const boardStatus = snapshot?.autodartsEnabled ? snapshot.boardStatus : undefined;
  const autodarts = boardStatus && <AutodartsStatus status={boardStatus} />;
  if (!game || !snapshot) return <div className="tv-idle">
    {autodarts && <div className="tv-idle-status">{autodarts}</div>}
    <h1><TvBrand /></h1>
    <p>{snapshot ? 'Čekám na zahájení hry' : 'Čekám na připojení'}</p>
  </div>;

  const x01 = game.mode === 'x01';
  const title = x01 ? game.result ? 'Výsledek rozhozu' : game.bull ? 'Rozhoz na střed'
    : `${game.settings.startScore} ${game.settings.doubleOut ? 'Double Out' : 'Straight Out'}`
    : <>Cricket <span className="cricket-variant">s body</span></>;
  const winner = x01 ? game.players.find(score => score.winner)?.player
    : game.winner === undefined ? undefined : game.score.players[game.winner]?.player;
  const liveBoard = snapshot.boardVisible && !winner;

  return <main className="page game tv-game">
    <div className="game-head">
      <div className="game-heading"><div><h1>{title}</h1>
        <p>{legsText(game.settings.legsToWin)} · leg {game.leg} · kolo {game.round}
          {x01 && game.settings.maxRounds && game.round <= game.settings.maxRounds ? ` z ${game.settings.maxRounds}` : ''}
          {x01 && game.finishersNeeded > 1 ? ` · zavřít musí ${game.finishersNeeded}` : ''}</p>
      </div></div>
      {x01 ? !game.bull && !game.result && <X01Visit state={game.visit} darts={game.darts} readOnly />
        : <CricketVisit darts={game.darts} marks={game.marks} points={game.points} readOnly />}
      <div className="tv-header-status">
        <TvBrand />
        {autodarts}
      </div>
    </div>
    {x01 && game.result ? <BullOffResults state={game.result} />
      : x01 && game.bull ? <BullOffArena {...game.bull} autodartsEnabled={snapshot.autodartsEnabled} />
      : <>
        {winner && <Winner player={winner} />}
        <div className="tv-workspace">
          {x01 ? <X01Players players={game.players} /> : <CricketScoreboard score={game.score} readOnly />}
          {liveBoard && <aside className="tv-board" aria-label="Živý terč"><Dartboard darts={game.darts} /></aside>}
        </div>
      </>}
  </main>;
}

function Receiver() {
  const [snapshot, setSnapshot] = useState<CastSnapshot>();
  const [scale, setScale] = useState(() => Math.min(innerWidth / 1920, innerHeight / 1080));
  useEffect(() => {
    const resize = () => setScale(Math.min(innerWidth / 1920, innerHeight / 1080));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const framework = (window as Window & { cast?: { framework: ReceiverFramework } }).cast?.framework;
    if (!framework) return;
    const context = framework.CastReceiverContext.getInstance();
    let active: string | undefined;
    let celebration = 0;
    const revisions = new Map<string, number>();
    context.addCustomMessageListener(CAST_NAMESPACE, ({ data, senderId }) => {
      const message = readCastMessage(data);
      if (!message) return;
      const revision = revisions.get(senderId) ?? 0;
      if (message.seq < revision) return;
      if (message.seq > revision) {
        revisions.set(senderId, message.seq);
        if (message.type === 'state') {
          const nextCelebration = message.snapshot.celebration ?? 0;
          if (active === senderId && nextCelebration > celebration) showConfetti();
          celebration = nextCelebration;
          active = senderId;
          setSnapshot(message.snapshot);
        } else if (active === senderId) {
          active = undefined;
          setSnapshot(undefined);
        }
      }
      try {
        context.sendCustomMessage(CAST_NAMESPACE, senderId, { v: CAST_PROTOCOL, type: 'received', seq: message.seq });
      } catch { /* Odesílač může mezitím opustit relaci. */ }
    });
    context.addEventListener(framework.system.EventType.SENDER_DISCONNECTED, ({ senderId }) => {
      revisions.delete(senderId);
      if (active !== senderId) return;
      active = undefined;
      setSnapshot(undefined);
    });
    context.start({
      disableIdleTimeout: true,
      customNamespaces: { [CAST_NAMESPACE]: framework.system.MessageType.JSON },
    });
  }, []);
  return <>
    <div className="tv-stage game-screen" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
      <Scoreboard snapshot={snapshot} />
    </div>
    <Confetti />
    <EffectVisual active={snapshot?.effect} />
  </>;
}

createRoot(document.getElementById('root')!).render(<Receiver />);

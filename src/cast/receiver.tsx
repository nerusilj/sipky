import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PlayerName from '../components/PlayerName.tsx';
import Dartboard from '../components/Dartboard.tsx';
import BullOffArena, { BullOffResults } from '../components/BullOffArena.tsx';
import { X01PlayerCard, X01Visit } from '../components/X01Scoreboard.tsx';
import { CricketScoreboard, CricketVisit } from '../components/CricketScoreboard.tsx';
import { TrophyIcon } from '../components/Icons.tsx';
import { legsText } from '../game/x01Presentation.ts';
import type { GamePlayer } from '../game/x01.ts';
import { CAST_NAMESPACE, CAST_PROTOCOL, readCastMessage } from './protocol.ts';
import type { CastSnapshot } from './protocol.ts';
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

function Scoreboard({ snapshot }: { snapshot?: CastSnapshot }) {
  const game = snapshot?.game;
  if (!game || !snapshot) return <div className="tv-idle">
    <h1>{snapshot?.venue || 'Šipky'}</h1>
    <p>{snapshot ? 'Čekám na zahájení hry' : 'Čekám na připojení Šipek'}</p>
  </div>;

  const x01 = game.mode === 'x01';
  const title = x01 ? game.result ? 'Výsledek rozhozu' : game.bull ? 'Rozhoz na střed'
    : `${game.settings.startScore} ${game.settings.doubleOut ? 'Double Out' : 'Straight Out'}`
    : <>Cricket <span className="cricket-variant">s body</span></>;
  const winner = x01 ? game.players.find(score => score.winner)?.player
    : game.winner === undefined ? undefined : game.score.players[game.winner]?.player;
  const liveBoard = snapshot.boardVisible && !winner;
  const count = x01 ? game.players.length : game.score.players.length;
  const columns = count <= 3 ? Math.max(1, count) : Math.ceil(count / 2);

  return <main className="page game tv-game">
    <div className="game-head">
      <div className="game-heading"><div><h1>{title}</h1>
        <p>{legsText(game.settings.legsToWin)} · leg {game.leg} · kolo {game.round}
          {x01 && game.settings.maxRounds && game.round <= game.settings.maxRounds ? ` z ${game.settings.maxRounds}` : ''}
          {x01 && game.finishersNeeded > 1 ? ` · zavřít musí ${game.finishersNeeded}` : ''}</p>
      </div></div>
      {x01 ? !game.bull && !game.result && <X01Visit state={game.visit} darts={game.darts} readOnly />
        : <CricketVisit darts={game.darts} marks={game.marks} points={game.points} readOnly />}
      <div className="tv-venue">{snapshot.venue}</div>
    </div>
    {x01 && game.result ? <BullOffResults state={game.result} />
      : x01 && game.bull ? <BullOffArena {...game.bull} autodartsEnabled={snapshot.autodartsEnabled} />
      : <>
        {winner && <Winner player={winner} />}
        <div className="tv-workspace">
          {x01 ? <div className="tv-players" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            data-single-row={count <= 3}>
            {game.players.map(score => <X01PlayerCard key={score.player.id} score={score} />)}
          </div> : <CricketScoreboard score={game.score} readOnly />}
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
    const revisions = new Map<string, number>();
    context.addCustomMessageListener(CAST_NAMESPACE, ({ data, senderId }) => {
      const message = readCastMessage(data);
      if (!message) return;
      const revision = revisions.get(senderId) ?? 0;
      if (message.seq < revision) return;
      if (message.seq > revision) {
        revisions.set(senderId, message.seq);
        if (message.type === 'state') {
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
  return <div className="tv-stage game-screen" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
    <Scoreboard snapshot={snapshot} />
  </div>;
}

createRoot(document.getElementById('root')!).render(<Receiver />);

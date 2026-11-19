import PlayerName from './PlayerName.tsx';
import Dartboard from './Dartboard.tsx';
import { shooterDartLabel } from '../game/shooter.ts';
import type { ShooterScore } from '../game/shooterPresentation.ts';
import type { ShooterClock } from '../game/shooterStore.ts';

export function shooterClockText(clock: ShooterClock): string {
  switch (clock.phase) {
    case 'off': return 'Bez časového limitu';
    case 'ready': return 'Připrav se na hod';
    case 'countdown': return 'Připrav se';
    case 'running': return 'Čas na šipku';
    case 'paused': return 'Pozastaveno';
    case 'timeout': return 'Čas vypršel · vytáhni šipky a pokračuj';
    case 'manual': return 'Ruční zadávání · čas je pozastavený';
    case 'offline': return 'Čas čeká na připojení Autodarts';
    case 'blocked': return 'Vyčkej na připravený a prázdný terč';
    case 'takeout': return 'Vytáhni šipky';
    case 'finished': return 'Hra dokončena';
    case 'bot': return 'Hraje bot';
  }
}

export function ShooterPlayers({ score }: { score: ShooterScore }) {
  return <div className="shooter-players" style={{ gridTemplateRows: `repeat(${score.players.length},minmax(0,1fr))` }} aria-label="Skóre hráčů">{score.players.map((player, i) => {
    const active = !score.finished && i === score.current;
    const attempts = score.attempts[i];
    return <section key={player.id} className={`shooter-player card${active ? ' shooter-active' : ''}${score.finished && score.winners.includes(i) ? ' shooter-winner' : ''}`}
      aria-current={active ? 'true' : undefined}>
      <PlayerName {...player} avatarSeed={player.id} avatarSize={34} />
      <strong className="shooter-player-points" aria-label={`${player.name}: ${score.points[i]} bodů`}>{score.points[i]}<small>{score.points[i] === 1 ? 'bod' : score.points[i] > 1 && score.points[i] < 5 ? 'body' : 'bodů'}</small></strong>
      <span className="shooter-player-metrics">Zásahy {score.points[i]} / {attempts} · {attempts ? Math.round(score.points[i] / attempts * 100) : 0} %</span>
    </section>;
  })}</div>;
}

export function ShooterVisit({ score, selected, onSelect }: { score: ShooterScore; selected?: number; onSelect?: (index: number) => void }) {
  return <section className="visit-strip shooter-visit" aria-label="Aktuální hody">
    {[0, 1, 2].map(i => {
      const dart = score.visit[i];
      const current = !score.finished && !score.visitResult.closed && i === score.visit.length;
      return <button key={i} className={`visit-slot${dart ? ' filled' : ' empty'}${dart && score.hits[i] ? ' shooter-hit' : ''}`}
        aria-label={`${i + 1}. pokus: ${dart || current || score.finished ? `cíl ${score.targets[i]}, ` : ''}${dart ? shooterDartLabel(dart) : current ? 'na řadě' : 'neházeno'}`}
        aria-pressed={selected === i} disabled={!onSelect || !dart && !current} onClick={() => onSelect?.(i)}>
        <small>{dart || current || score.finished ? `CÍL ${score.targets[i]}` : `${i + 1}. POKUS`}</small>
        <strong>{dart ? shooterDartLabel(dart) : '—'}</strong>
        {dart && <span className="shooter-hit-result">{score.hits[i] ? '+1' : '+0'}</span>}
      </button>;
    })}
    <div className="visit-total" aria-label={`Body v kole: ${score.visitResult.points}`}><strong>{score.visitResult.points}</strong><span>body</span></div>
  </section>;
}

export function ShooterTarget({ score, clock, showBoard = true }: { score: ShooterScore; clock: ShooterClock; showBoard?: boolean }) {
  const completed = score.visitResult.closed || score.finished;
  return <section className={`shooter-target card${!showBoard ? ' shooter-target--no-board' : ''}${clock.phase === 'timeout' ? ' shooter-expired' : ''}`} aria-label="Vylosovaný cíl">
    <div className="shooter-target-number" aria-live="polite"><span className="eyebrow">{score.finished ? 'KONEC HRY' : completed ? 'KOLO DOKONČENO' : 'TREF ČÍSLO'}</span>
      <strong>{completed ? `${score.visitResult.points} / ${score.visit.length}` : score.target}</strong>
      <span>{completed ? 'zásahů v posledním kole' : 'Single, double i triple platí za 1 bod'}</span>
    </div>
    {showBoard && <div className="shooter-target-board"><Dartboard darts={score.visit.filter(d => !d.timeout && !d.skipped)} target={score.target} /></div>}
    <div className="shooter-clock" role="status">
      <span>{completed && clock.phase === 'off' ? 'Kolo dokončeno' : shooterClockText(clock)}</span>
      {(clock.phase === 'running' || clock.phase === 'countdown') && <strong>{clock.phase === 'countdown' ? Math.max(1, Math.ceil(clock.remainingMs / 1000)) : (clock.remainingMs / 1000).toFixed(1).replace('.', ',')}<small>{clock.phase === 'running' ? ' s' : ''}</small></strong>}
      {clock.phase === 'running' && <progress aria-label="Zbývající čas" max={score.settings.seconds * 1000} value={clock.remainingMs} />}
    </div>
  </section>;
}

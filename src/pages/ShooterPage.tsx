import { useEffect, useRef, useState } from 'react';
import type { Dart } from '../game/x01.ts';
import { DEFAULT_SHOOTER_SETTINGS, shooterDartLabel, validShooterSettings } from '../game/shooter.ts';
import type { ShooterSettings, ShooterState } from '../game/shooter.ts';
import { shooterLengthText, shooterScore } from '../game/shooterPresentation.ts';
import { endShooter, enterShooterDart, nextShooterPlayer, pauseShooter, rematchShooter, replaceShooterDart, resumeShooterClock, startShooter, undoShooterDart, useShooter } from '../game/shooterStore.ts';
import { availableGamePlayers } from '../game/bots.ts';
import { loadLastSetup } from '../game/lastSetup.ts';
import { rememberLastPlayedMode } from '../game/lastPlayed.ts';
import { shuffle } from '../game/order.ts';
import { usePlayers } from '../players/players.ts';
import { useBoardVisible, useShowDev } from '../settings.ts';
import SegmentedControl from '../components/SegmentedControl.tsx';
import SetupPlayersPanel from '../components/SetupPlayersPanel.tsx';
import PlayerName from '../components/PlayerName.tsx';
import GamePlayerDialog from '../components/GamePlayerDialog.tsx';
import GameToolbar from '../components/GameToolbar.tsx';
import type { GameToolbarActions } from '../components/GameToolbar.tsx';
import GameControls from '../components/GameControls.tsx';
import ThrowKeypad from '../components/ThrowKeypad.tsx';
import ConfirmLeaveDialog from '../components/ConfirmLeaveDialog.tsx';
import { CloseIcon, ExitIcon, PlusIcon, TrophyIcon } from '../components/Icons.tsx';
import { ShooterPlayers, ShooterTarget, ShooterVisit } from '../components/ShooterScoreboard.tsx';
import '../shooter.css';

const SETUP_KEY = 'sipky.lastShooterSetup';
const playerCount = (n: number) => `${n} ${n === 1 ? 'hráč' : n < 5 ? 'hráči' : 'hráčů'}`;
function loadSetup(): { playerIds: string[]; randomOrder: boolean; settings: ShooterSettings } {
  const fallback = { playerIds: loadLastSetup().playerIds, randomOrder: true, settings: DEFAULT_SHOOTER_SETTINGS };
  try {
    const value = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (!value) return fallback;
    return {
      playerIds: Array.isArray(value.playerIds) ? [...new Set(value.playerIds.filter((id: unknown): id is string => typeof id === 'string'))] as string[] : fallback.playerIds,
      randomOrder: typeof value.randomOrder === 'boolean' ? value.randomOrder : true,
      settings: validShooterSettings(value.settings) ? value.settings : DEFAULT_SHOOTER_SETTINGS,
    };
  } catch { return fallback; }
}

export default function ShooterPage(actions: GameToolbarActions) {
  const { state } = useShooter();
  useEffect(() => {
    const pause = () => { if (document.hidden) pauseShooter(); };
    document.addEventListener('visibilitychange', pause);
    return () => { document.removeEventListener('visibilitychange', pause); pauseShooter(); };
  }, []);
  return state ? <ShooterBoard state={state} {...actions} /> : <ShooterSetup />;
}

function ShooterSetup() {
  const { players, loaded } = usePlayers();
  const showDev = useShowDev();
  const [last] = useState(loadSetup);
  const [selected, setSelected] = useState(last.playerIds.slice(0, 8));
  const [settings, setSettings] = useState(last.settings);
  const [random, setRandom] = useState(last.randomOrder), [picker, setPicker] = useState(false);
  const available = availableGamePlayers(players);
  const chosen = selected.flatMap(id => available.filter(p => p.id === id));
  function start() {
    if (!chosen.length || !showDev) return;
    startShooter(settings, random ? shuffle(chosen) : chosen);
    try { localStorage.setItem(SETUP_KEY, JSON.stringify({ playerIds: chosen.map(p => p.id), randomOrder: random, settings })); } catch { /* Volitelné uložení. */ }
    rememberLastPlayedMode('shooter');
  }
  return <div className="page game-setup shooter-setup">
    <div className="page-heading game-setup-heading"><div><h1>Nová hra Shooter</h1><p>Zasáhni vylosované číslo. Každá šipka přináší nový cíl.</p></div></div>
    {!showDev && <div className="notice" role="status"><span>Shooter připravujeme. Pro zkušební hraní zapněte sekci DEV v Nastavení.</span></div>}
    <SetupPlayersPanel loaded={loaded} count={chosen.length} randomOrder={random} onRandomOrder={setRandom}>
        {chosen.map(player => <div className="setup-member" key={player.id}>
          <PlayerName {...player} avatarSeed={player.id} avatarSize={32} />
          <button className="icon-button setup-remove-player" aria-label={`Odebrat hráče ${player.name} ze hry`} onClick={() => setSelected(ids => ids.filter(id => id !== player.id))}><CloseIcon size={18} /></button>
        </div>)}
        <button className="setup-add-player" aria-label="Přidat hráče" title="Přidat hráče" disabled={chosen.length >= 8} onClick={() => setPicker(true)}><PlusIcon size={22} /><span className="setup-add-player-label">Přidat hráče</span></button>
    </SetupPlayersPanel>
    {picker && <GamePlayerDialog selected={chosen.map(p => p.id)} limit={8} onClose={() => setPicker(false)}
      onAdd={id => setSelected(ids => { const present = ids.filter(id => available.some(p => p.id === id)); return present.includes(id) || present.length >= 8 ? present : [...present, id]; })} />}
    <section className="card setup-section shooter-rules">
      <h2>Pravidla hry</h2>
      <div className="rule-group">Konec hry<SegmentedControl<ShooterSettings['finish']> label="Konec Shooteru" value={settings.finish}
        onChange={finish => setSettings(s => ({ ...s, finish }))} options={[{ value: 'rounds', label: 'Na počet kol' }, { value: 'race', label: 'První na 15 bodů' }]} /></div>
      {settings.finish === 'rounds' && <div className="rule-group">Počet kol<SegmentedControl<ShooterSettings['rounds']> label="Počet kol" value={settings.rounds}
        onChange={rounds => setSettings(s => ({ ...s, rounds }))} options={[5, 10, 15].map(n => ({ value: n as ShooterSettings['rounds'], label: `${n} kol` }))} /></div>}
      <div className="rule-group">Čas na šipku<SegmentedControl<ShooterSettings['seconds']> label="Čas na šipku" value={settings.seconds}
        onChange={seconds => setSettings(s => ({ ...s, seconds }))} options={[{ value: 0, label: 'Bez limitu' }, { value: 10, label: '10 sekund' }, { value: 15, label: '15 sekund' }]} /></div>
      <p className="small">Losují se čísla 1–20. Single, double i triple správného čísla platí za 1 bod. Po každém hodu se cíl změní, i při minutí. Hráči se střídají po třech pokusech. Při shodě bodů po posledním kole se vítězství dělí.</p>
      {settings.seconds > 0 && <p className="small shooter-rule-note">Čas běží při hře přes Autodarts po odpočtu 3–2–1. Po vypršení se pokus počítá za 0 bodů; vytáhněte šipky a potvrďte pokračování. Při ručním zadávání je čas pozastavený.</p>}
    </section>
    <div className="setup-start"><span className="muted">{chosen.length ? `${shooterLengthText(settings)} · ${playerCount(chosen.length)} · ${settings.seconds ? `${settings.seconds} s na šipku` : 'bez časového limitu'}` : 'Vyberte alespoň jednoho hráče.'}</span>
      <button className="primary-orange setup-start-button" disabled={!chosen.length || !loaded || !showDev} onClick={start}>Začít hru</button></div>
  </div>;
}

function ShooterBoard({ state, ...actions }: { state: ShooterState } & GameToolbarActions) {
  const { game, clock, physicalEmpty, boardPhase, boardNotice, botPaused } = useShooter();
  const showBoard = useBoardVisible();
  const [manual, setManual] = useState(false), [multiplier, setMultiplier] = useState(1);
  const [selected, setSelected] = useState<number>();
  const [end, setEnd] = useState(false), [stats, setStats] = useState(false), [skip, setSkip] = useState(false);
  const score = shooterScore(state), botTurn = !!state.players[state.current].bot && !state.finished;
  useEffect(() => { setSelected(undefined); setMultiplier(1); setSkip(false); }, [state.history.length]);
  const editIndex = selected !== undefined && selected < state.visit.length ? selected : !state.visitResult.closed ? state.visit.length : undefined;
  const choose = (index: number) => { pauseShooter(); setManual(true); setSelected(index); setMultiplier(state.visit[index]?.multiplier || 1); };
  const hit = (dart: Dart) => {
    if (editIndex === undefined) return;
    if (editIndex < state.visit.length) replaceShooterDart(editIndex, dart); else enterShooterDart(dart);
    setSelected(undefined);
  };
  const pendingClock = !['off', 'running', 'countdown', 'takeout', 'finished', 'bot'].includes(clock.phase);
  const clockCanResume = !['offline', 'blocked'].includes(clock.phase) && (clock.phase !== 'timeout' && clock.phase !== 'manual' || physicalEmpty);
  return <div className="page game shooter-game">
    <div className="game-head">
      <div className="game-heading"><button className="icon-button game-exit" aria-label={state.finished ? 'Nová hra' : 'Konec hry'} onClick={() => { pauseShooter(); if (state.finished) endShooter(); else setEnd(true); }}><ExitIcon size={25} /></button>
        <div><h1>Shooter</h1><p>{shooterLengthText(state.settings)} · kolo {state.round}{state.settings.finish === 'rounds' ? ` z ${state.settings.rounds}` : ''}</p></div>
      </div>
      <ShooterVisit score={score} selected={manual ? editIndex : undefined} onSelect={!state.finished && !botTurn ? choose : undefined} />
      <div className="game-head-actions"><GameToolbar {...actions} onSettings={() => { pauseShooter(); actions.onSettings(); }} layoutOptions={false} statisticsOpen={stats} onStatistics={() => { pauseShooter(); setStats(true); }} /></div>
    </div>
    {boardNotice && <p className="cricket-notice" role="status">{boardNotice}</p>}
    {state.finished && <section className="shooter-result card" role="status">
      <TrophyIcon size={32} /><div><span className="eyebrow">{state.winners.length > 1 ? 'SPOLEČNÍ VÍTĚZOVÉ' : 'VÍTĚZ HRY'}</span><h2>{state.winners.map(i => state.players[i].name).join(' · ')}</h2></div>
      <div className="winner-actions"><button className="primary" onClick={rematchShooter}>Odveta</button><button onClick={endShooter}>Nová hra</button></div>
    </section>}
    <div className={`shooter-workspace${manual && !state.finished ? ' shooter-with-keypad' : ''}`}>
      <ShooterPlayers score={score} />
      <ShooterTarget score={score} clock={clock} showBoard={showBoard || !manual} />
      {manual && !state.finished && <aside className="shooter-keypad"><ThrowKeypad disabled={editIndex === undefined || botTurn || clock.phase === 'timeout'} completing={false} multiplier={multiplier} onMultiplier={setMultiplier} onHit={hit} /></aside>}
    </div>
    {pendingClock && !botTurn && !state.finished && <div className="shooter-clock-actions">
      <button className="primary" disabled={!clockCanResume} onClick={() => { setManual(false); setSelected(undefined); resumeShooterClock(); }}>{clock.phase === 'manual' ? 'Pokračovat s Autodarts' : clock.phase === 'ready' ? 'Připravit hod' : 'Pokračovat'}</button>
      {clock.phase === 'timeout' && !physicalEmpty && <span>Nejdřív vytáhněte všechny šipky.</span>}
    </div>}
    {(clock.phase === 'running' || clock.phase === 'countdown') && <div className="shooter-clock-actions"><button onClick={pauseShooter}>Pozastavit čas</button></div>}
    <div className="game-controls-anchor">
      {skip && <div className="skip-confirm card" role="alert"><p>Zapsat zbývající pokusy bez zásahu?</p><button className="primary" onClick={() => { setSkip(false); nextShooterPlayer(); }}>Potvrdit kolo</button><button onClick={() => setSkip(false)}>Zrušit</button></div>}
      <GameControls canUndo={!!game?.visits.length || !!game?.current.length} onUndo={() => { undoShooterDart(); setSelected(undefined); setManual(true); }}
        onKeyboard={!state.finished && !botTurn ? () => { pauseShooter(); setManual(!manual); setSelected(undefined); } : undefined} keyboardOpen={manual}
        onMiss={!state.finished && !botTurn ? () => enterShooterDart({ name: 'M', number: 0, multiplier: 0, score: 0 }) : undefined}
        missDisabled={state.visitResult.closed || clock.phase === 'timeout'} confirmSkip={skip}
        onNext={!state.finished ? () => { if (botTurn || state.visitResult.closed || skip) nextShooterPlayer(); else { pauseShooter(); setSkip(true); } } : undefined}
        nextLabel={botTurn && botPaused ? 'Pokračovat s botem' : 'Další hráč'}
        nextDisabled={botTurn ? !botPaused : boardPhase !== 'manual' && !physicalEmpty} />
    </div>
    {end && <ConfirmLeaveDialog action="endGame" onCancel={() => setEnd(false)} onConfirm={endShooter} />}
    {stats && <ShooterStatistics state={state} onClose={() => setStats(false)} />}
  </div>;
}

function ShooterStatistics({ state, onClose }: { state: ShooterState; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} id="game-statistics" className="statistics-dialog" aria-labelledby="shooter-stats-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="statistics-heading"><div><span className="eyebrow">SHOOTER</span><h2 id="shooter-stats-title">Statistiky hry</h2></div><button className="icon-button" aria-label="Zavřít statistiky" onClick={onClose}><CloseIcon size={26} /></button></div>
    <div className="statistics-summary card"><table><thead><tr><th>Hráč</th><th>Body</th><th>Pokusy</th><th>Šipky</th><th>Úspěšnost</th></tr></thead><tbody>
      {state.players.map((p, i) => <tr key={p.id}><th scope="row"><PlayerName {...p} avatarSeed={p.id} avatarSize={32} /></th><td>{state.points[i]}</td><td>{state.attempts[i]}</td><td>{state.dartsThrown[i]}</td><td>{state.attempts[i] ? Math.round(state.points[i] / state.attempts[i] * 100) : 0} %</td></tr>)}
    </tbody></table></div>
    <p className="small">Pokusy zahrnují vypršení času a vynechané šipky. Úspěšnost = správné zásahy / všechny pokusy.</p>
    <h3>Průběh hry</h3><div className="cricket-history"><table><thead><tr><th>Kolo</th><th>Hráč</th><th>Cíle → hody</th><th>Body</th></tr></thead><tbody>
      {state.history.map((visit, i) => <tr key={i}><td>{visit.round}</td><td>{state.players[visit.player].name}</td><td>{visit.darts.map((dart, n) => `${visit.targets[n]} → ${shooterDartLabel(dart)}`).join(' · ')}</td><td>+{visit.points}</td></tr>)}
    </tbody></table></div>
  </dialog>;
}

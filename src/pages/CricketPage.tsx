import { CricketScoreboard, CricketVisit, decimal } from '../components/CricketScoreboard.tsx';
import { cricketScore } from '../game/cricketPresentation.ts';
import SegmentedControl from '../components/SegmentedControl.tsx';
import SetupPlayersPanel from '../components/SetupPlayersPanel.tsx';
import { availableGamePlayers } from '../game/bots.ts';
import { useEffect, useRef, useState } from 'react';
import PlayerName from '../components/PlayerName.tsx';
import GamePlayerDialog from '../components/GamePlayerDialog.tsx';
import GameToolbar from '../components/GameToolbar.tsx';
import type { GameToolbarActions } from '../components/GameToolbar.tsx';
import GameControls from '../components/GameControls.tsx';
import ThrowKeypad from '../components/ThrowKeypad.tsx';
import Dartboard from '../components/Dartboard.tsx';
import ConfirmLeaveDialog from '../components/ConfirmLeaveDialog.tsx';
import { ChevronIcon, CloseIcon, ExitIcon, PlusIcon, TrophyIcon } from '../components/Icons.tsx';
import { cricketTotals } from '../game/cricket.ts';
import type { CricketState } from '../game/cricket.ts';
import { endCricket, enterCricketDart, nextCricketPlayer, rematchCricket, replaceCricketDart, startCricket, undoCricketDart, useCricket } from '../game/cricketStore.ts';
import { dartLabel } from '../game/x01.ts';
import type { Dart } from '../game/x01.ts';
import { loadLastSetup, parseLastSetup } from '../game/lastSetup.ts';
import { rememberLastPlayedMode } from '../game/lastPlayed.ts';
import { shuffle } from '../game/order.ts';
import { usePlayers } from '../players/players.ts';
import { useBoardVisible } from '../settings.ts';

const SETUP_KEY = 'sipky.lastCricketSetup';
const legsText = (legs: number) => legs === 0 ? 'Hra dokola' : legs === 1 ? 'Na 1 vítězný leg' : legs < 5 ? `Na ${legs} vítězné legy` : `Na ${legs} vítězných legů`;
const playerCount = (n: number) => `${n} ${n === 1 ? 'hráč' : n < 5 ? 'hráči' : 'hráčů'}`;
export default function CricketPage(actions: GameToolbarActions) {
  const { state } = useCricket();
  return state ? <CricketBoard state={state} {...actions} /> : <CricketSetup />;
}
function CricketSetup() {
  const { players, loaded } = usePlayers();
  const [last] = useState(() => {
    try { const json = localStorage.getItem(SETUP_KEY); return json ? parseLastSetup(json) : { ...loadLastSetup(), legsToWin: 1 }; }
    catch { return { ...loadLastSetup(), legsToWin: 1 }; }
  });
  const [selected, setSelected] = useState(last.playerIds.slice(0, 8));
  const [legs, setLegs] = useState(last.legsToWin);
  const [random, setRandom] = useState(last.randomOrder);
  const [picker, setPicker] = useState(false);
  const available = availableGamePlayers(players);
  const chosen = selected.flatMap(id => available.filter(player => player.id === id));
  function start() {
    if (!chosen.length) return;
    startCricket({ legsToWin: legs }, (random ? shuffle(chosen) : chosen).map(({ id, name, color, avatarId, avatarColor, bot }) => ({ id, name, color, avatarId, avatarColor, bot })));
    try { localStorage.setItem(SETUP_KEY, JSON.stringify({ playerIds: chosen.map(p => p.id), legsToWin: legs, randomOrder: random })); } catch { /* Nastavení je volitelné. */ }
    rememberLastPlayedMode('cricket');
  }
  return <div className="page game-setup">
    <div className="page-heading game-setup-heading"><div><h1>Nová hra Cricket</h1><p>Zavřete čísla 20–15 a BULL a získejte nejvíce bodů.</p></div></div>
    <SetupPlayersPanel loaded={loaded} count={chosen.length} randomOrder={random} onRandomOrder={setRandom}>
        {chosen.map(player => <div className="setup-member" key={player.id}>
          <PlayerName {...player} avatarSeed={player.id} avatarSize={32} />
          <button className="icon-button setup-remove-player" aria-label={`Odebrat hráče ${player.name} ze hry`} onClick={() => setSelected(ids => ids.filter(id => id !== player.id))}><CloseIcon size={18} /></button>
        </div>)}
        <button className="setup-add-player" aria-label="Přidat hráče" title="Přidat hráče" disabled={chosen.length >= 8} aria-haspopup="dialog" onClick={() => setPicker(true)}><PlusIcon size={22} /><span className="setup-add-player-label">Přidat hráče</span></button>
    </SetupPlayersPanel>
    {picker && <GamePlayerDialog selected={chosen.map(p => p.id)} limit={8} onClose={() => setPicker(false)} onAdd={id => setSelected(ids => {
      const current = ids.filter(id => available.some(player => player.id === id)); return current.includes(id) || current.length >= 8 ? current : [...current, id];
    })} />}
    <details className="card setup-section setup-rules-panel">
      <summary className="setup-rules-summary"><span className="setup-rules-overview"><strong>Pravidla hry</strong>
        <span className="setup-rules-description">Cricket s body · {legsText(legs)} · Bez limitu kol</span>
        <span className="setup-rules-secondary">Další leg začíná vždy další hráč v pořadí.</span>
      </span><span className="setup-rules-action"><ChevronIcon size={22} /></span></summary>
      <div className="setup-rules"><div className="rule-group">Konec zápasu<SegmentedControl label="Konec zápasu" value={legs} onChange={setLegs}
        options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n, label: n === 0 ? '∞ Dokola' : n }))} /></div><p className="small">Každé číslo zavřete třemi zásahy. Single platí za jeden, double za dva a triple za tři. Vnější BULL platí za jeden zásah, vnitřní za dva. Další zásahy přidávají body, dokud má některý soupeř číslo otevřené. Vyhrává hráč, který zavře všechna čísla a má alespoň tolik bodů jako každý soupeř. Při hře jednoho hráče stačí zavřít všechna čísla.</p></div>
    </details>
    <div className="setup-start"><span className="muted">{chosen.length ? `${legsText(legs)} · ${playerCount(chosen.length)}${random ? ' · náhodné pořadí' : ''}` : 'Vyberte alespoň jednoho hráče.'}</span>
      <button className="primary-orange setup-start-button" disabled={!chosen.length} onClick={start}>Začít hru</button></div>
  </div>;
}
function CricketBoard({ state, ...actions }: { state: CricketState } & GameToolbarActions) {
  const { game, completing, boardNotice, botPaused } = useCricket();
  const boardVisible = useBoardVisible();
  const [manual, setManual] = useState(false), [multiplier, setMultiplier] = useState(1);
  const [selected, setSelected] = useState<{ identity: string; index: number }>();
  const [end, setEnd] = useState(false), [skip, setSkip] = useState(false), [stats, setStats] = useState(false);
  const finished = state.winner !== undefined;
  const botTurn = !!state.players[state.current].bot && !finished;
  const identity = `${state.leg}:${state.current}:${state.history.length}`;
  useEffect(() => { setSelected(undefined); setMultiplier(1); setSkip(false); }, [identity]);
  const last = finished ? state.history.at(-1) : undefined;
  const darts = finished ? last?.darts ?? [] : game?.current ?? state.visit;
  const marks = last?.marks ?? state.visitResult.marks;
  const points = last?.scored ?? state.visitResult.scored;
  const editIndex = botTurn ? undefined : selected?.identity === identity && selected.index < darts.length ? selected.index : !state.visitResult.closed && darts.length < 3 ? darts.length : undefined;
  const choose = (index: number) => { setManual(true); setSelected({ identity, index }); setMultiplier(darts[index]?.multiplier || 1); };
  const hit = (dart: Dart) => {
    if (editIndex === undefined) return;
    if (editIndex < darts.length) replaceCricketDart(editIndex, dart); else enterCricketDart(dart);
    setSelected(undefined);
  };
  return <div className="page game cricket-game">
    <div className="game-head">
      <div className="game-heading"><button className="icon-button game-exit" aria-label={finished ? 'Nová hra' : 'Konec hry'} onClick={() => finished ? endCricket() : setEnd(true)}><ExitIcon size={25} /></button>
        <div><h1>Cricket <span className="cricket-variant">s body</span></h1><p>{legsText(state.settings.legsToWin)} · {playerCount(state.order.length)} · leg {state.leg} · kolo {state.round}</p></div>
      </div>
      <CricketVisit darts={darts} marks={marks} points={points} selected={manual ? editIndex : undefined}
        closed={state.visitResult.closed} onSelect={!finished && !botTurn && !completing ? choose : undefined} />
      <div className="game-head-actions"><GameToolbar {...actions} layoutOptions={false} statisticsOpen={stats} onStatistics={() => setStats(true)} /></div>
    </div>
    {boardNotice && <p role="status" className="cricket-notice">{boardNotice}</p>}
    {finished && <section className="winner-panel card" role="status" aria-label="Výsledek zápasu">
      <div className="winner-heading"><span className="winner-trophy"><TrophyIcon size={30} /></span><div><span className="eyebrow">VÍTĚZ ZÁPASU</span><h2><PlayerName {...state.players[state.winner!]} avatarSeed={state.players[state.winner!].id} avatarSize={40} /></h2></div></div>
      <div className="winner-results">{state.players.map((player, i) => <div className="winner-result" key={player.id}><PlayerName name={player.name} /><strong>{state.legsWon[i]}<small>{state.legsWon[i] === 1 ? 'leg' : state.legsWon[i] > 1 && state.legsWon[i] < 5 ? 'legy' : 'legů'}</small></strong><span>MPR {decimal(cricketTotals(state, i).mpr)}</span></div>)}</div>
      <div className="winner-actions"><button className="primary" onClick={rematchCricket}>Odveta</button><button onClick={endCricket}>Nová hra</button></div>
    </section>}
    <div className={`cricket-workspace ${manual && !finished || boardVisible && !finished ? 'has-cricket-side' : ''}`}>
      <CricketScoreboard score={cricketScore(state)} />
      {manual && !finished ? <aside className="cricket-side" aria-label="Ruční zadání"><ThrowKeypad disabled={editIndex === undefined || !!completing} completing={!!completing} multiplier={multiplier} onMultiplier={setMultiplier} onHit={hit} /></aside>
        : boardVisible && !finished && <aside id="game-board-panel" className="cricket-side" aria-label="Živý terč"><Dartboard darts={darts} /></aside>}
    </div>
    <div className="game-controls-anchor">
      {botTurn && botPaused && <p className="bot-paused-note" role="status">Bot pozastavený · pokračujte tlačítkem vpravo</p>}
      {skip && <div className="skip-confirm card" role="alert"><p>Zapsat kolo bez zásahu?</p><button className="primary" onClick={() => { setSkip(false); nextCricketPlayer(); }}>Zapsat bez zásahu</button><button onClick={() => setSkip(false)}>Zrušit</button></div>}
      <GameControls canUndo={!!game?.visits.length || !!darts.length}
        onUndo={() => { undoCricketDart(); setManual(true); setSelected(undefined); }}
        onKeyboard={!finished ? () => { setManual(!manual); setSelected(undefined); setMultiplier(1); } : undefined}
        keyboardOpen={manual} confirmSkip={skip} nextLabel={botTurn && botPaused ? 'Pokračovat s botem' : 'Další hráč'}
        nextDisabled={!!completing || (botTurn && !botPaused)}
        onNext={!finished ? () => botTurn || darts.length ? nextCricketPlayer() : setSkip(!skip) : undefined} />
    </div>
    {end && <ConfirmLeaveDialog action="endGame" onCancel={() => setEnd(false)} onConfirm={endCricket} />}
    {stats && <CricketStatistics state={state} onClose={() => setStats(false)} />}
  </div>;
}
function CricketStatistics({ state, onClose }: { state: CricketState; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} id="game-statistics" className="statistics-dialog" aria-labelledby="cricket-stats-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="statistics-heading"><div><span className="eyebrow">CRICKET</span><h2 id="cricket-stats-title">Statistiky hry</h2></div><button className="icon-button" aria-label="Zavřít statistiky" onClick={onClose}><CloseIcon size={26} /></button></div>
    <div className="statistics-summary card"><table><thead><tr><th>Hráč</th><th>Legy</th><th>Zásahy</th><th>Body</th><th>Šipky</th><th>MPR</th></tr></thead><tbody>
      {state.players.map((player, i) => { const totals = cricketTotals(state, i); return <tr key={player.id}><th scope="row"><PlayerName {...player} avatarSeed={player.id} avatarSize={32} /></th><td>{state.legsWon[i]}</td><td>{totals.marks}</td><td>{totals.points}</td><td>{totals.darts}</td><td>{decimal(totals.mpr)}</td></tr>; })}
    </tbody></table></div><p className="small cricket-stats-note">MPR = průměr platných zásahů na tři šipky. Zásahy do čísel zavřených všemi hráči se nezapočítávají. Kolo potvrzené před třetí šipkou se počítá jako tři šipky; vítězné kolo podle skutečného počtu.</p>
    <h3>Průběh hry</h3><div className="cricket-history">{state.history.length ? <table><thead><tr><th>Leg / kolo</th><th>Hráč</th><th>Hody</th><th>Zásahy</th><th>Body</th></tr></thead><tbody>
      {state.history.map((visit, i) => <tr key={i}><td>{visit.leg} / {visit.round}</td><td>{state.players[visit.player].name}</td><td className="history-darts">{visit.darts.map(dartLabel).join(' · ') || '—'}</td><td>{visit.marks}</td><td>+{visit.scored}</td></tr>)}
    </tbody></table> : <p className="muted">Zatím nebylo dokončeno žádné kolo.</p>}</div>
  </dialog>;
}

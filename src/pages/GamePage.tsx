import SegmentedControl from '../components/SegmentedControl.tsx';
import BullOffArena, { BullOffResults } from '../components/BullOffArena.tsx';
import { bullThrowNeedsDistance, bullThrowRequiresTakeout } from '../game/bullOffRanking.ts';
import PlacementBadge from '../components/PlacementBadge.tsx';
import { availableGamePlayers } from '../game/bots.ts';
import ThrowKeypad from '../components/ThrowKeypad.tsx';
import PlayerName from '../components/PlayerName.tsx';
import Dartboard from '../components/Dartboard.tsx';
import GameToolbar from '../components/GameToolbar.tsx';
import GameControls from '../components/GameControls.tsx';
import FinishLegDialog from '../components/FinishLegDialog.tsx';
import GamePlayerDialog from '../components/GamePlayerDialog.tsx';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Toggle from '../components/Toggle.tsx';
import { ChevronIcon, CloseIcon, ExitIcon, PencilIcon, PlusIcon, TrophyIcon, VisitDartIcon } from '../components/Icons.tsx';
import { useAutodartsEnabled, useGameView, useBoardVisible } from '../settings.ts';
import { suggestCheckout } from '../game/checkout.ts';
import { cancelGameBullOff, continueAfterBullOff, correctBullOffThrow, endGame, enterDart, markBullOffMiss, nextPlayer, rematch, replaceCurrentDart, startGame, undoDart, useGame } from '../game/gameStore.ts';
import { dartLabel, DARTS_PER_VISIT, ENDLESS, legDartNumber, legThreeDartAverage, NO_ROUND_LIMIT, playerDisplayedLegsWon, playerFinishPlace, playerTotals, threeDartAverage } from '../game/x01.ts';
import type { Dart, GamePlayer, NextLegOrder, X01Settings, X01State } from '../game/x01.ts';
import { loadLastSetup, ROUND_LIMITS, saveLastSetup } from '../game/lastSetup.ts';
import { START_SCORES, isStartScore } from '../game/startScores.ts';
import type { StartScore } from '../game/startScores.ts';
import { shuffle } from '../game/order.ts';
import { gamePanelLayout } from '../game/panelLayout.ts';
import { usePlayers } from '../players/players.ts';

const MAX_GAME_PLAYERS = 8;
// ENDLESS = hra dokola, jinak počet vítězných legů, který ukončí zápas.
const LEG_OPTIONS = [ENDLESS, 1, 2, 3, 4, 5];

export default function GamePage({ onSettings }: { onSettings: () => void }) {
  const { state } = useGame();
  return state ? <GameBoard state={state} onSettings={onSettings} /> : <GameSetup />;
}

function legsText(n: number): string {
  if (n === ENDLESS) return 'Hra dokola';
  return n === 1 ? 'Na 1 vítězný leg' : n < 5 ? `Na ${n} vítězné legy` : `Na ${n} vítězných legů`;
}

// Česky: 1 leg, 2–4 legy, 0 a 5+ legů.
function legCount(n: number): string {
  return `${n} ${n === 1 ? 'leg' : n >= 2 && n <= 4 ? 'legy' : 'legů'}`;
}

const QUICK_SCORES: readonly StartScore[] = [301, 501];

function GameSetup() {
  const { players, loaded } = usePlayers();
  // Předvyplnění podle poslední hry; výchozí je náhodné pořadí (vylosuje se při startu).
  const [last] = useState(loadLastSetup);
  const [score, setScore] = useState<StartScore>(last.startScore);
  const [selected, setSelected] = useState<string[]>(last.playerIds);
  const [legsToWin, setLegsToWin] = useState(last.legsToWin);
  const [doubleOut, setDoubleOut] = useState(last.doubleOut);
  const [randomOrder, setRandomOrder] = useState(last.randomOrder);
  const [legOrder, setLegOrder] = useState<NextLegOrder>(last.nextLegOrder);
  const [maxRounds, setMaxRounds] = useState(last.maxRounds);
  const [minFinishers, setMinFinishers] = useState(last.minFinishers);
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false);
  const chooseScore = (value: StartScore) => {
    setScore(value);
    saveLastSetup({ ...loadLastSetup(), startScore: value });
  };
  const removeGamePlayer = (id: string) => setSelected(list => list.filter(other => other !== id));
  // Vybraní hráči v pořadí hry; další se vybírají v dialogu.
  const available = availableGamePlayers(players);
  const chosen = selected.flatMap(id => available.filter(player => player.id === id));
  function addGamePlayer(id: string) {
    setSelected(ids => {
      const current = ids.filter(id => available.some(player => player.id === id));
      return current.includes(id) || current.length >= MAX_GAME_PLAYERS ? current : [...current, id];
    });
  }
  // Zavřít musí 1 až (počet hráčů − 1); zapamatovaná hodnota se omezí podle aktuálního výběru.
  const maxFinishers = Math.max(1, chosen.length - 1);
  const finishers = Math.min(minFinishers, maxFinishers);
  function start() {
    saveLastSetup({ startScore: score, playerIds: chosen.map(player => player.id), randomOrder, legsToWin, doubleOut, nextLegOrder: legOrder, maxRounds, minFinishers });
    const order = randomOrder ? shuffle(chosen) : chosen;
    if (order.length) startGame({ startScore: score, doubleOut, legsToWin, nextLegOrder: legOrder, maxRounds, minFinishers: finishers } satisfies X01Settings,
      order.map(({ id, name, color, avatarId, bot }) => ({ id, name, color, avatarId, bot })));
  }
  return <div className="page">
    <div className="page-heading"><div><h1>Nová hra X01</h1><p>Vyberte počáteční skóre, hráče a pravidla.</p></div></div>
    <section className="settings-card card setup-section">
      <span className="eyebrow">POČÁTEČNÍ SKÓRE</span>
      <div className="setup-score-choice">
        <SegmentedControl label="Počáteční skóre" value={score} onChange={chooseScore} options={QUICK_SCORES.map(value => ({ value, label: value }))} />
        <select className={QUICK_SCORES.includes(score) ? '' : 'selected'} aria-label="Další počáteční skóre" value={QUICK_SCORES.includes(score) ? '' : score}
          onChange={event => { const value = Number(event.target.value); if (isStartScore(value)) chooseScore(value); }}>
          <option value="" disabled>Další varianty…</option>
          {START_SCORES.filter(value => !QUICK_SCORES.includes(value)).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
    </section>
    <section className="settings-card card setup-section">
      <div className="setup-players-head">
        <span className="eyebrow">HRÁČI</span>
        <SegmentedControl label="Pořadí hráčů" value={randomOrder} onChange={setRandomOrder}
          options={[{ value: false, label: 'Podle výběru' }, { value: true, label: 'Náhodné' }]} />
      </div>
      {!loaded ? <p className="muted">Načítám hráče…</p> : <>
        {!chosen.length && <p className="muted small">Vyberte hráče pro tuto hru.</p>}
        <div className="setup-players">{chosen.map((player, order) =>
          <SelectedGamePlayer key={player.id} player={player} order={randomOrder ? undefined : order + 1} onRemove={() => removeGamePlayer(player.id)} />)}
          <button className="setup-add-player" aria-haspopup="dialog" aria-controls="game-player-dialog" aria-expanded={playerPickerOpen}
            onClick={() => setPlayerPickerOpen(true)}><PlusIcon size={22} />Přidat hráče</button>
        </div>
      </>}
    </section>
    {playerPickerOpen && <GamePlayerDialog selected={chosen.map(player => player.id)} limit={MAX_GAME_PLAYERS}
      onAdd={addGamePlayer} onClose={() => setPlayerPickerOpen(false)} />}
    <details className="card setup-section setup-rules-panel">
      <summary className="setup-rules-summary">
        <span className="setup-rules-overview"><strong>Pravidla hry</strong>
          <span className="setup-rules-description">{legsText(legsToWin)} · {doubleOut ? 'Double Out' : 'Straight Out'} · {maxRounds === NO_ROUND_LIMIT ? 'Bez limitu kol' : `Max. ${maxRounds} kol na leg`}</span>
          <span className="setup-rules-secondary">Další leg: {legOrder === 'loserFirst' ? 'od posledního' : 'střídání začínajícího hráče'}{chosen.length >= 3 && ` · Zavřít musí ${finishers === 1 ? '1 hráč' : `${finishers} hráči`}`}</span>
        </span>
        <span className="setup-rules-action" aria-hidden="true"><span className="rules-expand-label">Upravit</span><span className="rules-collapse-label">Sbalit</span><ChevronIcon size={22} /></span>
      </summary>
      <div className="setup-rules">
        <div className="rule-group">Konec zápasu
          <SegmentedControl label="Konec zápasu" value={legsToWin} onChange={setLegsToWin} options={LEG_OPTIONS.map(n => ({ value: n, label: n === ENDLESS ? '∞ Dokola' : n,
            title: n === ENDLESS ? 'Hraje se dokola, legy se počítají, zápas nekončí' : `Vyhrává, kdo první vyhraje ${legCount(n)}` }))} />
          <span className="small">{legsToWin === ENDLESS ? 'Legy se počítají, zápas ukončíte tlačítkem Konec hry.' : `Vyhrává, kdo první vyhraje ${legCount(legsToWin)}.`}</span></div>
        <div className="rule-group">Max. kol na leg
          <SegmentedControl label="Maximální počet kol na leg" value={maxRounds} onChange={setMaxRounds}
            options={ROUND_LIMITS.map(n => ({ value: n, label: n === NO_ROUND_LIMIT ? 'Bez limitu' : n }))} />
          <span className="small">{maxRounds === NO_ROUND_LIMIT ? 'Hraje se, dokud někdo nezavře.' : `Když po ${maxRounds}. kole nikdo nezavře, rozhodne rozhoz na střed.`}</span></div>
        {chosen.length >= 3 && <div className="rule-group">Zavřít musí
          <SegmentedControl label="Kolik hráčů musí zavřít" value={finishers} onChange={setMinFinishers}
            options={Array.from({ length: maxFinishers }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'hráč' : i < 4 ? 'hráči' : 'hráčů'}` }))} />
          <span className="small">{finishers === 1 ? 'Leg končí prvním zavřením.' : `Leg končí, až zavřou ${finishers} hráči; leg vyhrává první.`}</span></div>}
        <div className="rule-group">Další leg začíná
          <SegmentedControl label="Další leg začíná" value={legOrder} onChange={setLegOrder}
            options={[{ value: 'loserFirst', label: 'Od posledního' }, { value: 'rotate', label: 'Střídání' }]} />
          <span className="small">{legOrder === 'loserFirst' ? 'První hází ten, komu zbylo nejvíc bodů; vítěz legu hází poslední.' : 'Pořadí zůstává, začíná vždy další hráč.'}</span></div>
        <Toggle checked={doubleOut} onChange={setDoubleOut}>Double Out (zavřít doublem nebo bullem)</Toggle>
      </div>
    </details>
    <div className="setup-start">
      <span className="muted">{chosen.length ? `${score} · ${legsText(legsToWin)} · ${chosen.length} ${chosen.length === 1 ? 'hráč' : chosen.length < 5 ? 'hráči' : 'hráčů'}${randomOrder && chosen.length > 1 ? ' · pořadí se vylosuje' : ''}` : 'Vyberte alespoň jednoho hráče.'}</span>
      <button className="primary big" disabled={!chosen.length} onClick={start}>Začít hru</button>
    </div>
  </div>;
}

// Přehled sestavy; přidávání probíhá výhradně v dialogu, křížek jen odebere hráče ze sestavy.
function SelectedGamePlayer({ player, order, onRemove }: { player: GamePlayer; order?: number; onRemove: () => void }) {
  return <div className="setup-member">
    {order !== undefined && <span className="setup-member-order" aria-label={`Pořadí ve hře: ${order}`}>{order}.</span>}
    <PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} />
    <button className="icon-button setup-remove-player" title={`Odebrat hráče ${player.name} ze hry`}
      aria-label={`Odebrat hráče ${player.name} ze hry`} onClick={onRemove}><CloseIcon size={18} /></button>
  </div>;
}

function GameBoard({ state, onSettings }: { state: X01State; onSettings: () => void }) {
  const gameView = useGameView();
  const autodartsEnabled = useAutodartsEnabled();
  const boardVisible = useBoardVisible();
  const { game, completing, botPaused, boardPhase, bullOffResultOpen } = useGame();
  const [manualVisible, setManualVisible] = useState(false);
  const [manualMultiplier, setManualMultiplier] = useState(1);
  const [selectedDart, setSelectedDart] = useState<{ key: string; index: number }>();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmBullOff, setConfirmBullOff] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const { settings } = state;
  const finished = state.winner !== undefined;
  const playerCount = state.order.length;
  const botTurn = !!state.players[state.current].bot && !finished;
  const bullDart = state.bullOff && state.visit[0];
  const waitingForBullTakeout = !!bullDart && !botTurn && boardPhase !== 'manual' && bullThrowRequiresTakeout(bullDart);
  const manualOpen = manualVisible && !finished && !state.bullOff && !bullOffResultOpen;
  // Po přehozu / zavření se ukazují pouze šipky, které patří do vyhodnoceného kola.
  const darts = state.visit;
  const visitIdentity = `${state.leg}:${state.current}:${state.history.length}`;
  useEffect(() => { setSelectedDart(undefined); setManualMultiplier(1); }, [visitIdentity]);
  const editIndex = botTurn ? undefined : selectedDart?.key === visitIdentity && selectedDart.index < darts.length ? selectedDart.index
    : !state.visitResult.closed && darts.length < DARTS_PER_VISIT ? darts.length : undefined;
  const selectDart = (index: number) => {
    setManualVisible(true);
    setSelectedDart({ key: visitIdentity, index });
    setManualMultiplier(darts[index]?.multiplier || 1);
  };
  const hit = (dart: Dart) => {
    if (editIndex === undefined) return;
    if (editIndex < darts.length) replaceCurrentDart(editIndex, dart);
    else enterDart(dart);
    setSelectedDart(undefined);
  };
  const keypad = <ThrowKeypad
    multiplier={manualMultiplier} onMultiplier={setManualMultiplier} onHit={hit}
    disabled={editIndex === undefined || !!completing} completing={!!completing} />;
  useEffect(() => { setConfirmSkip(false); }, [state.history.length, state.current, state.leg, state.bullOff?.round, completing]);
  return <div className="page game">
    <div className="game-head">
      <div className="game-heading">
        <button className="icon-button game-exit" aria-label={finished ? 'Nová hra' : 'Konec hry'} title={finished ? 'Nová hra' : 'Konec hry'}
          aria-haspopup="dialog" aria-controls="end-game-dialog" onClick={() => setConfirmEnd(true)}><ExitIcon size={25} /></button>
        <div><h1>{bullOffResultOpen ? 'Výsledek rozhozu' : state.bullOff ? 'Rozhoz na střed' : `${settings.startScore} ${settings.doubleOut ? 'Double Out' : 'Straight Out'}`}</h1>
        <p>{legsText(settings.legsToWin)} · {playerCount} {playerCount === 1 ? 'hráč' : playerCount < 5 ? 'hráči' : 'hráčů'} · leg {bullOffResultOpen ? state.lastBullOffResult?.leg : state.leg}
          {' · '}kolo {state.round}{settings.maxRounds && state.round <= settings.maxRounds ? ` z ${settings.maxRounds}` : ''}
          {state.finishersNeeded > 1 && ` · zavřít musí ${state.finishersNeeded}`}</p></div>
      </div>
      {!state.bullOff && !bullOffResultOpen && <SharedVisit state={state} darts={darts} selected={manualOpen ? editIndex : undefined}
        onSelect={!finished && !botTurn && !state.bullOff && !completing ? selectDart : undefined} />}
      <div className="game-head-actions">
        <GameToolbar statisticsOpen={statisticsOpen} onStatistics={() => setStatisticsOpen(true)} onSettings={onSettings}
          onBullOff={autodartsEnabled && !finished ? () => setConfirmBullOff(true) : undefined} bullOffActive={!!state.bullOff || !!bullOffResultOpen} />
      </div>
    </div>
    {bullOffResultOpen && state.lastBullOffResult ? <BullOffResults state={state} onContinue={continueAfterBullOff} /> : <>
    {finished && <WinnerPanel state={state} onNewGame={endGame} />}
    {state.bullOff && !finished ? <BullOffArena state={state} phase={boardPhase} busy={!!completing} onCorrect={correctBullOffThrow} /> :
    <div className={`game-play-layout view-${gameView} ${boardVisible && !manualOpen ? 'has-side-panel' : ''}`}>
      <div className="game-dashboard">
        {gameView === 'rows' ? <GameRows state={state} keypad={manualOpen ? keypad : undefined} />
          : gameView === 'focus' ? <GameFocus state={state} keypad={manualOpen ? keypad : undefined} />
          : <GamePlayers state={state} keypad={manualOpen ? keypad : undefined} />}
      </div>
      {boardVisible && !manualOpen && <aside id="game-board-panel" className="game-side-panel" aria-label="Živý terč">
        <Dartboard darts={darts} />
      </aside>}
    </div>
    }</>}
    <div className="game-controls-anchor">
      {botTurn && botPaused && <p className="bot-paused-note" role="status">Bot pozastavený · pokračujte tlačítkem vpravo</p>}
      {confirmSkip && <div className="skip-confirm card" role="alert"><p>Zapsat kolo bez skóre?</p>
        <button className="primary" onClick={nextPlayer}>Zapsat bez skóre</button><button onClick={() => setConfirmSkip(false)}>Zrušit</button></div>}
      <GameControls canUndo={!!game?.visits.length || !!game?.current.length}
        onMiss={state.bullOff && !state.visit.length && !botTurn ? markBullOffMiss : undefined}
        missDisabled={!!state.visit.length || botTurn || !!completing || boardPhase !== 'ready'}
        onCancelBullOff={state.bullOff ? cancelGameBullOff : undefined}
        onUndo={() => {
          if (undoDart() === 'manual') setManualVisible(true);
          setSelectedDart(undefined);
          setManualMultiplier(1);
        }}
        onKeyboard={!finished && !state.bullOff && !bullOffResultOpen ? () => { setManualVisible(visible => !visible); setManualMultiplier(1); setSelectedDart(undefined); } : undefined}
        keyboardOpen={manualOpen} confirmSkip={confirmSkip} nextLabel={botTurn && botPaused ? 'Pokračovat s botem' : 'Další hráč'}
        nextDisabled={!!completing || (botTurn && !botPaused) || waitingForBullTakeout || (!!state.bullOff?.ranking && !!bullDart && bullThrowNeedsDistance(bullDart))}
        onNext={!finished && !bullOffResultOpen && (!state.bullOff || !!state.visit.length || (botTurn && botPaused)) ? () => { if (botTurn || state.visit.length) nextPlayer(); else setConfirmSkip(!confirmSkip); } : undefined} />
    </div>
    {statisticsOpen && <StatisticsDialog state={state} onClose={() => setStatisticsOpen(false)} />}
    {confirmEnd && <EndGameDialog state={state} onClose={() => setConfirmEnd(false)} />}
    {confirmBullOff && <FinishLegDialog state={state} onClose={() => setConfirmBullOff(false)} />}
  </div>;
}

type PlayerViewProps = { state: X01State; keypad?: ReactNode };

function GameFocus({ state, keypad }: PlayerViewProps) {
  const featured = state.winner ?? state.current;
  const others = state.order.filter(index => index !== featured);
  return <div className={`game-focus-viewport ${keypad ? 'has-keypad' : ''} ${others.length ? '' : 'solo'}`} role="region" aria-label="Zobrazení aktivního hráče">
    <div className="game-focus-stage">
      <PlayerScore state={state} index={featured} />
      {keypad && <div className="game-focus-keypad">{keypad}</div>}
    </div>
    {others.length > 0 && <aside className="game-focus-opponents" aria-label="Ostatní hráči">
      {others.map(index => <PlayerScore key={state.players[index].id} state={state} index={index} />)}
    </aside>}
  </div>;
}

function GameRows({ state, keypad }: PlayerViewProps) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = viewport.current;
    const active = container?.querySelector<HTMLElement>(`[data-player-index="${state.current}"]`);
    if (!container || !active) return;
    const bounds = container.getBoundingClientRect(), row = active.getBoundingClientRect();
    const delta = row.top < bounds.top ? row.top - bounds.top : row.bottom > bounds.bottom ? row.bottom - bounds.bottom : 0;
    if (delta) container.scrollTo({ top: container.scrollTop + delta, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [state.current, state.leg, !!keypad]);
  return <div className={`game-row-viewport ${keypad ? 'has-keypad' : ''}`} ref={viewport} role="region" aria-label="Hráči v řádcích">
    <div className="game-row-list">{state.order.map(index => <PlayerScore key={state.players[index].id} state={state} index={index} />)}</div>
    {keypad && <aside className="game-row-keypad" aria-label="Ruční zadávání">{keypad}</aside>}
  </div>;
}

function GamePlayers({ state, keypad }: PlayerViewProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState(() => gamePanelLayout(1260, 674));
  useLayoutEffect(() => {
    const node = viewport.current!;
    const style = getComputedStyle(node);
    setLayout(gamePanelLayout(node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)));
    const observer = new ResizeObserver(([entry]) => {
      setLayout(gamePanelLayout(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = viewport.current;
    const tile = node?.querySelector<HTMLElement>(`[data-player-index="${state.current}"]`);
    if (!node || !tile) return;
    const bounds = node.getBoundingClientRect(), card = tile.getBoundingClientRect();
    const delta = card.top < bounds.top + 8 ? card.top - bounds.top - 8
      : card.bottom > bounds.bottom - 8 ? card.bottom - bounds.bottom + 8 : 0;
    if (delta) node.scrollTo({ top: node.scrollTop + delta,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [state.current, state.leg, state.history.length, !!keypad, layout.tileWidth, layout.tileHeight, layout.viewportHeight]);
  return <div ref={viewport} className="game-player-viewport" role="region" aria-label="Hráči a klávesnice"
    style={{ '--game-columns': Math.min(layout.columns, state.order.length + (keypad ? 1 : 0)),
      '--game-tile-width': `${layout.tileWidth}px`, '--game-tile-height': `${layout.tileHeight}px`,
      '--game-score-size': `${layout.scoreSize}px` } as CSSProperties}>
    <div className="game-players">{state.order.map((index, position) => <Fragment key={state.players[index].id}>
      <PlayerScore state={state} index={index} />
      {position === 0 && keypad}
    </Fragment>)}</div>
  </div>;
}

function BustFragments() {
  return <div className="bust-fragments" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>;
}

function SharedVisit({ state, darts, selected, onSelect }: { state: X01State; darts: Dart[]; selected?: number; onSelect?: (index: number) => void }) {
  const finished = state.winner !== undefined;
  const last = finished && !state.lastLegByBullOff ? state.history.at(-1) : undefined;
  const shown = finished ? last?.darts ?? [] : darts;
  const result = last ?? state.visitResult;
  const total = state.bullOff ? shown[0]?.score ?? 0 : result.scored;
  return <section className={`visit-strip ${result.bust ? 'has-bust' : ''}`} aria-label="Aktuální hody" aria-live="polite">
    {result.bust && <BustFragments />}
    {Array.from({ length: DARTS_PER_VISIT }, (_, i) => {
      const label = `${i + 1}. šipka: ${shown[i] ? dartLabel(shown[i]) : 'neházeno'}`;
      const className = `visit-slot ${shown[i] ? 'filled' : 'empty'}`;
      const content = <>{shown[i] ? <strong className="dart-register" key={dartLabel(shown[i])}>{dartLabel(shown[i])}</strong> : <VisitDartIcon />}
        {selected === i && <span className="visit-edit-icon"><PencilIcon size={15} /></span>}</>;
      // Při potvrzení kola zachovat stejný element: button → div by znovu spustilo animaci všech čísel.
      return <button type="button" key={i} className={className} aria-label={label} aria-pressed={selected === i}
        title={shown[i] ? `Opravit ${i + 1}. šipku` : `Zadat ${i + 1}. šipku`}
        disabled={!onSelect || (!shown[i] && (i !== shown.length || state.visitResult.closed))} onClick={() => onSelect?.(i)}>{content}</button>;
    })}
    <div className={`visit-total ${result.bust ? 'bust' : ''}`} aria-label={result.bust ? 'Výsledek kola: BUST' : `Skóre kola: ${total}`}>
      {(state.bullOff || finished && state.lastLegByBullOff) && <span>Rozhoz</span>}
      <strong>{result.bust ? 'BUST' : total}</strong></div>
  </section>;
}

function EndGameDialog({ state, onClose }: { state: X01State; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const finished = state.winner !== undefined;
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    continueButton.current?.focus();
  }, []);
  const close = () => { dialog.current?.close(); onClose(); };
  return <dialog ref={dialog} id="end-game-dialog" className="end-game-dialog" aria-labelledby="end-game-title" aria-describedby="end-game-description"
    onCancel={event => { event.preventDefault(); close(); }}>
    <div className="end-dialog-body">
      <div className="end-dialog-top"><span className="end-dialog-symbol" aria-hidden="true"><ExitIcon size={25} /></span>
        <button className="icon-button" aria-label="Zavřít dialog" title="Zavřít" onClick={close}><CloseIcon size={22} /></button></div>
      <h2 id="end-game-title">{finished ? 'Začít novou hru?' : 'Ukončit rozehranou hru?'}</h2>
      <p id="end-game-description">{finished ? 'Přejdete k výběru hráčů a pravidel pro další zápas.' : 'Vrátíte se k výběru nové hry. V rozehraném zápase už nebude možné pokračovat.'}</p>
      <dl className="end-dialog-summary">
        <div><dt>Hra</dt><dd>{state.settings.startScore}<span>{state.settings.doubleOut ? 'Double Out' : 'Straight Out'}</span></dd></div>
        <div><dt>Leg</dt><dd>{state.leg}</dd></div>
        <div><dt>Hráči</dt><dd>{state.order.length}</dd></div>
      </dl>
    </div>
    <div className="end-dialog-actions"><button className="primary" ref={continueButton} onClick={close}>{finished ? 'Zpět k výsledku' : 'Pokračovat ve hře'}<ChevronIcon size={20} /></button>
      <button className={`end-confirm ${finished ? 'new-game' : ''}`} onClick={() => { close(); endGame(); }}><ExitIcon size={18} />{finished ? 'Nová hra' : 'Ukončit hru'}</button></div>
  </dialog>;
}

function StatisticsDialog({ state, onClose }: { state: X01State; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  const close = () => { dialog.current?.close(); onClose(); };
  return <dialog ref={dialog} id="game-statistics" className="statistics-dialog" aria-labelledby="statistics-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <div className="statistics-heading"><div><span className="eyebrow">ZÁPAS {state.settings.startScore}</span><h2 id="statistics-title">Statistiky hry</h2></div>
      <button className="icon-button" aria-label="Zavřít statistiky" title="Zavřít statistiky" onClick={close}><CloseIcon size={26} /></button></div>
    <div className="statistics-summary card"><table><thead><tr><th>Hráč</th><th>Legy</th><th>Body</th><th>Šipky</th><th>Průměr na 3</th></tr></thead>
      <tbody>{state.players.map((player, i) => <tr key={player.id}><td><PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} /></td><td>{playerDisplayedLegsWon(state, i)}</td>
        <td>{playerTotals(state, i).points}</td><td>{playerTotals(state, i).darts}</td><td>{threeDartAverage(state, i).toFixed(1).replace('.', ',')}</td></tr>)}</tbody></table></div>
    {state.history.length ? <History state={state} /> : <p className="muted">Zatím nebylo dokončeno žádné kolo.</p>}
  </dialog>;
}

function PlayerScore({ state, index }: { state: X01State; index: number }) {
  const player = state.players[index];
  const active = index === state.current && state.winner === undefined && !state.bullOff;
  const busted = active && state.visitResult.bust;
  const place = playerFinishPlace(state, index);
  const legsWon = playerDisplayedLegsWon(state, index);
  const remaining = active ? state.visitResult.remaining : state.remaining[index];
  const dartsLeft = active ? DARTS_PER_VISIT - state.visit.length : DARTS_PER_VISIT;
  const checkout = active && state.settings.doubleOut && !state.visitResult.closed ? suggestCheckout(remaining, dartsLeft) : undefined;
  const lastVisit = [...state.history].reverse().find(visit => visit.player === index && visit.leg === state.leg);
  // Aktivní hráč začíná vždy prázdným pruhem, předchozí kolo zůstává jen u čekajících hráčů.
  const shownDarts = active ? state.visit : lastVisit?.darts ?? [];
  const visitTotal = active ? state.visitResult.scored : lastVisit?.scored ?? 0;
  const visitBusted = active ? state.visitResult.bust : lastVisit?.bust ?? false;
  const dartNumber = legDartNumber(state, index);
  const legAverage = legThreeDartAverage(state, index).toFixed(1).replace('.', ',');
  return <section className={`score-card card ${active ? 'active' : ''} ${busted ? 'has-bust' : ''} ${state.winner === index ? 'winner' : ''} ${place !== undefined ? 'done' : ''}`} aria-label={player.name} data-player-index={index}>
    {busted && <BustFragments />}
    {place !== undefined && <PlacementBadge place={place} />}
    <div className="score-head">
      <div className="score-player-details"><PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} avatarSize={52} className="plain" /></div>
    </div>
    <div className="player-score-line"><div className="score-remaining">{remaining}</div>
      <span className="player-legs-badge" aria-label={`Vyhrané legy: ${legsWon}`} title={`Vyhráno ${legCount(legsWon)}`}><span>{legsWon}</span></span>
    </div>
    <div className={`player-bottom ${checkout ? 'has-checkout' : ''}`}>
    <div className="player-visit-strip" role="group" aria-hidden={!!checkout} aria-label={active ? 'Aktuální hody hráče' : 'Poslední kolo hráče'}>
      {Array.from({ length: DARTS_PER_VISIT }, (_, i) => <div key={i} className={`player-visit-slot ${shownDarts[i] ? 'filled' : 'empty'}`}
        aria-label={`${i + 1}. šipka: ${shownDarts[i] ? dartLabel(shownDarts[i]) : 'neházeno'}`}>
        {shownDarts[i] ? <strong>{dartLabel(shownDarts[i])}</strong> : <VisitDartIcon />}
      </div>)}
      <div className="player-visit-slot player-visit-total" aria-label={visitBusted ? 'Výsledek kola: BUST' : `Skóre kola: ${visitTotal}`}>
        <strong>{visitBusted ? 'BUST' : visitTotal}</strong>
      </div>
    </div>
    <div className="player-leg-summary" role="group" aria-hidden={!!checkout} aria-label="Šipky a průměr aktuálního legu">
      <span className="leg-dart-number" aria-label={`Hozené šipky v legu: ${dartNumber}`}
        title={`V aktuálním legu hozeno ${dartNumber} šipek`}><VisitDartIcon /><strong>{dartNumber}</strong></span>
      <span className="leg-summary-divider" aria-hidden="true" />
      <span className="leg-average" aria-label={`Průměr aktuálního legu na 3 šipky: ${legAverage}`} title="Průměr aktuálního legu na 3 šipky"><span aria-hidden="true">Ø</span><strong>{legAverage}</strong></span>
    </div>
    {checkout && <div className="player-checkout" role="group" aria-label={`Zavřít: ${checkout.map(dartLabel).join(', ')}`} title={`Doporučené zavření: ${checkout.map(dartLabel).join(' → ')}`}>
      <div className="player-checkout-route" aria-hidden="true">{checkout.map((dart, i) =>
        <span className="player-checkout-step" key={i}><strong className={i === checkout.length - 1 ? 'checkout-finish' : ''}>{dartLabel(dart)}</strong>
          {i < checkout.length - 1 && <span className="checkout-arrow">→</span>}</span>)}
      </div>
    </div>}
    </div>
  </section>;
}


function History({ state }: { state: X01State }) {
  const [leg, setLeg] = useState(state.leg);
  useEffect(() => setLeg(state.leg), [state.leg]);
  const legs = [...new Set([...state.history.map(visit => visit.leg), state.leg])];
  const legVisits = state.history.filter(visit => visit.leg === leg);
  // Všechna kola vybraného legu, nejnovější nahoře.
  const rounds = [...new Set(legVisits.map(visit => visit.round))].reverse().map(number => ({ number, visits: legVisits.filter(visit => visit.round === number) }));
  if (!state.history.length) return null;
  return <section className="history card" aria-label="Průběh legu">
    <div className="history-heading"><h2>Průběh hry</h2><label>Leg <select aria-label="Zobrazený leg" value={leg} onChange={event => setLeg(Number(event.target.value))}>
      {legs.map(n => <option key={n} value={n}>{n}</option>)}</select></label></div>
    {!rounds.length && <p className="muted small">V tomto legu zatím není dokončené kolo.</p>}
    <table><thead><tr><th>Kolo</th>{state.players.map(player => <th key={player.id}><PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} /></th>)}</tr></thead>
      <tbody>{rounds.map(round => <tr key={round.number}><td>{round.number}</td>
        {state.players.map((_, p) => { const visit = round.visits.find(v => v.player === p); return <td key={p}>{visit
          ? <><strong className={visit.bust ? 'bust' : visit.checkout ? 'checkout-hit' : ''}>{visit.bust ? 'BUST' : visit.scored}</strong>
            <span className="history-darts">{visit.darts.map(dartLabel).join(' ')}</span></> : ''}</td>; })}</tr>)}</tbody></table>
  </section>;
}

function WinnerPanel({ state, onNewGame }: { state: X01State; onNewGame: () => void }) {
  const winner = state.players[state.winner!];
  return <section className="winner-panel card" role="status" aria-label="Výsledek zápasu">
    <div className="winner-heading"><span className="winner-trophy"><TrophyIcon size={30} /></span><div><span className="eyebrow">VÍTĚZ ZÁPASU</span><h2><PlayerName name={winner.name} color={winner.color} avatarSeed={winner.id} avatarId={winner.avatarId} avatarSize={40} /></h2></div></div>
    <div className="winner-results">{[state.winner!, ...state.order.filter(index => index !== state.winner)].map(i => <div className="winner-result" key={state.players[i].id}>
      <PlayerName name={state.players[i].name} /><strong>{state.legsWon[i]}<small>{legCount(state.legsWon[i]).replace(/^\d+ /, '')}</small></strong><span>Ø {threeDartAverage(state, i).toFixed(1).replace('.', ',')}</span>
    </div>)}</div>
    <div className="winner-actions"><button className="primary" onClick={rematch}>Odveta</button><button onClick={onNewGame}>Nová hra</button></div>
  </section>;
}

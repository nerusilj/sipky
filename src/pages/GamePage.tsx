import { useEffect, useRef, useState } from 'react';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import { useConnection } from '../connection.ts';
import { suggestCheckout } from '../game/checkout.ts';
import { endGame, enterDart, nextPlayer, rematch, startGame, undoDart, useGame } from '../game/gameStore.ts';
import { dartLabel, DARTS_PER_VISIT, makeDart, threeDartAverage } from '../game/x01.ts';
import type { Dart, X01Settings, X01State } from '../game/x01.ts';
import { loadLastSetup, saveLastSetup } from '../game/lastSetup.ts';
import { shuffle } from '../game/order.ts';
import type { Player } from '../players/playerList.ts';
import { usePlayers } from '../players/players.ts';

const MAX_GAME_PLAYERS = 8;
const LEG_OPTIONS = [1, 2, 3, 4, 5];

export default function GamePage({ startScore, onPlayers }: { startScore: 301 | 501; onPlayers: () => void }) {
  const { state } = useGame();
  return state ? <GameBoard state={state} /> : <GameSetup initialScore={startScore} onPlayers={onPlayers} />;
}

function legsText(n: number): string {
  return n === 1 ? 'Na 1 vítězný leg' : n < 5 ? `Na ${n} vítězné legy` : `Na ${n} vítězných legů`;
}

// Česky: 1 leg, 2–4 legy, 0 a 5+ legů.
function legCount(n: number): string {
  return `${n} ${n === 1 ? 'leg' : n >= 2 && n <= 4 ? 'legy' : 'legů'}`;
}

function GameSetup({ initialScore, onPlayers }: { initialScore: 301 | 501; onPlayers: () => void }) {
  const { players, loaded } = usePlayers();
  const [score, setScore] = useState<301 | 501>(initialScore);
  // Předvyplnění podle poslední hry; výchozí je náhodné pořadí (vylosuje se při startu).
  const [last] = useState(loadLastSetup);
  const [selected, setSelected] = useState<string[]>(last.playerIds);
  const [legsToWin, setLegsToWin] = useState(last.legsToWin);
  const [doubleOut, setDoubleOut] = useState(last.doubleOut);
  const [randomOrder, setRandomOrder] = useState(last.randomOrder);
  useEffect(() => setScore(initialScore), [initialScore]);
  const toggle = (id: string) => setSelected(list => list.includes(id) ? list.filter(other => other !== id)
    : list.length < MAX_GAME_PLAYERS ? [...list, id] : list);
  // Vybraní hráči nahoře v pořadí hry, ostatní pod nimi abecedně.
  const chosen = selected.flatMap(id => players.filter(player => player.id === id));
  const others = players.filter(player => !selected.includes(player.id)).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  function start() {
    saveLastSetup({ playerIds: chosen.map(player => player.id), randomOrder, legsToWin, doubleOut });
    const order = randomOrder ? shuffle(chosen) : chosen;
    if (order.length) startGame({ startScore: score, doubleOut, legsToWin } satisfies X01Settings, order.map(({ id, name, color }) => ({ id, name, color })));
  }
  return <div className="page">
    <div className="page-heading"><div><h1>Nová hra</h1><p>Vyberte hru, hráče a pravidla.</p></div></div>
    <section className="settings-card card setup-section">
      <span className="eyebrow">HRA</span>
      <div className="segmented">{([501, 301] as const).map(value => <button key={value} className={score === value ? 'selected' : ''} onClick={() => setScore(value)}>{value}</button>)}</div>
    </section>
    <section className="settings-card card setup-section">
      <div className="setup-players-head">
        <span className="eyebrow">HRÁČI</span>
        <div className="segmented small" role="group" aria-label="Pořadí hráčů">
          <button className={randomOrder ? '' : 'selected'} onClick={() => setRandomOrder(false)}>Podle výběru</button>
          <button className={randomOrder ? 'selected' : ''} onClick={() => setRandomOrder(true)}>⤨ Náhodné</button>
        </div>
      </div>
      {!loaded ? <p className="muted">Načítám hráče…</p> : players.length === 0
        ? <p className="muted">Nejdřív přidejte hráče. <button className="text-button" onClick={onPlayers}>Přejít na Hráče ›</button></p>
        : <>
          {chosen.length ? <div className="setup-players">{chosen.map((player, order) =>
            <PlayerChip key={player.id} player={player} order={randomOrder ? 'random' : order} onClick={() => toggle(player.id)} />)}</div>
            : <p className="muted small">{randomOrder ? 'Klepnutím vyberte hráče. Pořadí se vylosuje při startu hry.' : 'Klepnutím vyberte hráče. Pořadí hry je pořadí výběru.'}</p>}
          {others.length > 0 && <>
            <span className="field-label setup-others">{chosen.length ? 'OSTATNÍ HRÁČI' : 'HRÁČI'}</span>
            <div className="setup-players">{others.map(player => <PlayerChip key={player.id} player={player} onClick={() => toggle(player.id)} />)}</div>
          </>}
        </>}
    </section>
    <section className="settings-card card setup-section">
      <span className="eyebrow">PRAVIDLA</span>
      <div className="setup-rules">
        <label>Počet vítězných legů<div className="segmented">{LEG_OPTIONS.map(n => <button key={n} className={legsToWin === n ? 'selected' : ''} onClick={() => setLegsToWin(n)}>{n}</button>)}</div></label>
        <label className="switch"><input type="checkbox" checked={doubleOut} onChange={event => setDoubleOut(event.target.checked)} /><span>Double Out (zavřít doublem nebo bullem)</span></label>
      </div>
    </section>
    <div className="setup-start">
      <span className="muted">{chosen.length ? `${score} · ${legsText(legsToWin)} · ${chosen.length} ${chosen.length === 1 ? 'hráč' : chosen.length < 5 ? 'hráči' : 'hráčů'}${randomOrder && chosen.length > 1 ? ' · pořadí se vylosuje' : ''}` : 'Vyberte alespoň jednoho hráče.'}</span>
      <button className="primary big" disabled={!chosen.length} onClick={start}>Začít hru</button>
    </div>
  </div>;
}

// Vybraný hráč: číslo pořadí, nebo při náhodném pořadí jen zelená fajfka.
function PlayerChip({ player, order, onClick }: { player: Player; order?: number | 'random'; onClick: () => void }) {
  const active = order !== undefined;
  return <button className={`setup-player ${active ? 'selected' : ''}`} onClick={onClick} aria-pressed={active}
    title={active ? 'Odebrat ze hry' : 'Přidat do hry'}>
    {order === 'random' ? <b className="order check" aria-label="Hraje">✓</b> : active && <b className="order">{order + 1}</b>}
    <PlayerAvatar player={player} size={40} /><span>{player.name}</span></button>;
}

function GameBoard({ state }: { state: X01State }) {
  const connection = useConnection();
  const [keypad, setKeypad] = useState(connection.state !== 'connected');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const banner = useLegBanner(state);
  const { settings, players } = state;
  const finished = state.winner !== undefined;
  return <div className="page game">
    <div className="game-head">
      <div><h1>{settings.startScore} {settings.doubleOut ? 'Double Out' : 'Straight Out'}</h1>
        <p>{legsText(settings.legsToWin)} · {players.length} {players.length === 1 ? 'hráč' : players.length < 5 ? 'hráči' : 'hráčů'} · leg {state.leg}
          {' · '}<span className={connection.state === 'connected' ? 'online-text' : ''}>{connection.state === 'connected' ? 'šipky z terče' : 'terč nepřipojen'}</span></p></div>
      <div className="game-head-actions">
        {confirmEnd ? <><span className="muted small">Ukončit hru?</span><button className="danger" onClick={() => { setConfirmEnd(false); endGame(); }}>Ukončit</button>
          <button onClick={() => setConfirmEnd(false)}>Pokračovat</button></>
          : <button className="end-game" onClick={() => finished ? endGame() : setConfirmEnd(true)}>{finished ? 'Nová hra' : 'Konec hry'}</button>}
      </div>
    </div>
    {banner && <div className="leg-banner" role="status">{banner}</div>}
    {finished && <WinnerPanel state={state} />}
    <div className="game-players">{players.map((_, i) => <PlayerScore key={players[i].id} state={state} index={i} />)}</div>
    {!finished && <div className="game-actions">
      <button onClick={undoDart} disabled={!state.history.length && !state.visit.length}>↶ Zpět</button>
      <button className={state.visitResult.closed ? 'primary' : ''} onClick={nextPlayer}>Další hráč ›</button>
      <span className="spacer"></span>
      <button aria-pressed={keypad} onClick={() => setKeypad(!keypad)}>{keypad ? 'Skrýt ruční zadání' : 'Ruční zadání'}</button>
    </div>}
    {!finished && keypad && <Keypad disabled={state.visitResult.closed} />}
    <History state={state} />
  </div>;
}

// Krátké oznámení „Leg pro …“ po zavřeném legu (ne po konci zápasu, ten má vlastní panel).
function useLegBanner(state: X01State): string | undefined {
  const legs = state.legsWon.reduce((a, b) => a + b, 0);
  const previous = useRef(legs);
  const [banner, setBanner] = useState<string>();
  useEffect(() => {
    if (legs > previous.current && state.winner === undefined && state.lastLegWinner !== undefined) {
      // Jméno v 1. pádě, ať je věta správně pro jakékoli jméno.
      setBanner(`Leg vyhrává ${state.players[state.lastLegWinner].name}!`);
      const timer = window.setTimeout(() => setBanner(undefined), 3500);
      previous.current = legs;
      return () => window.clearTimeout(timer);
    }
    previous.current = legs;
  }, [legs, state.winner, state.lastLegWinner, state.players]);
  return banner;
}

function PlayerScore({ state, index }: { state: X01State; index: number }) {
  const player = state.players[index];
  const active = index === state.current && state.winner === undefined;
  const lastVisit = [...state.history].reverse().find(visit => visit.player === index && visit.leg === state.leg);
  const darts: Dart[] = active ? state.visit : lastVisit?.darts ?? [];
  const result = active ? state.visitResult : lastVisit;
  const remaining = active ? state.visitResult.remaining : state.remaining[index];
  const dartsLeft = active ? DARTS_PER_VISIT - state.visit.length : DARTS_PER_VISIT;
  const checkout = state.settings.doubleOut && !(active && state.visitResult.closed) ? suggestCheckout(remaining, dartsLeft) : undefined;
  return <section className={`score-card card ${active ? 'active' : ''} ${state.winner === index ? 'winner' : ''}`} aria-label={player.name}>
    <div className="score-head">
      <PlayerAvatar player={player} size={52} />
      <div><strong>{player.name}</strong>
        <span className="legs" aria-label={`Legy ${state.legsWon[index]}`}>{Array.from({ length: state.settings.legsToWin }, (_, i) =>
          <i key={i} className={i < state.legsWon[index] ? 'won' : ''} />)}</span></div>
    </div>
    <div className="score-remaining">{remaining}</div>
    <div className="score-darts">{Array.from({ length: DARTS_PER_VISIT }, (_, i) =>
      <span key={i} className={darts[i] ? '' : 'empty'}>{darts[i] ? dartLabel(darts[i]) : '–'}</span>)}</div>
    <div className="score-stats">
      <div><span className="field-label">KOLO</span><strong className={result?.bust ? 'bust' : ''}>{result ? (result.bust ? 'Přehoz' : result.scored) : '–'}</strong></div>
      <div><span className="field-label">PRŮMĚR</span><strong>{threeDartAverage(state, index).toFixed(1)}</strong></div>
      <div className="checkout"><span className="field-label">CHECKOUT</span><strong>{checkout ? checkout.map(dartLabel).join(' ') : '–'}</strong></div>
    </div>
  </section>;
}

function Keypad({ disabled }: { disabled: boolean }) {
  const [multiplier, setMultiplier] = useState(1);
  const hit = (number: number, m: number) => { enterDart(makeDart(number, m)); setMultiplier(1); };
  return <section className="keypad card" aria-label="Ruční zadání šipek">
    <div className="keypad-mods">{[[1, 'Single'], [2, 'Double'], [3, 'Triple']].map(([m, label]) =>
      <button key={m} className={multiplier === m ? 'selected' : ''} onClick={() => setMultiplier(m as number)} disabled={disabled}>{label}</button>)}</div>
    <div className="keypad-numbers">
      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <button key={n} disabled={disabled} onClick={() => hit(n, multiplier)}>{n}</button>)}
      <button disabled={disabled} onClick={() => hit(25, 1)}>25</button>
      <button disabled={disabled} onClick={() => hit(25, 2)}>Bull</button>
      <button disabled={disabled} className="miss" onClick={() => hit(0, 0)}>Mimo</button>
    </div>
    {disabled && <p className="muted small">Kolo je uzavřené, pokračujte tlačítkem Další hráč.</p>}
  </section>;
}

function History({ state }: { state: X01State }) {
  const n = state.players.length;
  const legVisits = state.history.filter(visit => visit.leg === state.leg);
  const total = Math.ceil(legVisits.length / n);
  // Posledních 8 kol, nejnovější nahoře.
  const rounds = Array.from({ length: total }, (_, r) => ({ number: r + 1, visits: legVisits.slice(r * n, r * n + n) })).reverse().slice(0, 8);
  if (!rounds.length) return null;
  return <section className="history card" aria-label="Průběh legu">
    <h2>Průběh legu {state.leg}</h2>
    <table><thead><tr><th>Kolo</th>{state.players.map(player => <th key={player.id}>{player.name}</th>)}</tr></thead>
      <tbody>{rounds.map(round => <tr key={round.number}><td>{round.number}</td>
        {state.players.map((_, p) => { const visit = round.visits.find(v => v.player === p); return <td key={p}>{visit
          ? <><strong className={visit.bust ? 'bust' : visit.checkout ? 'checkout-hit' : ''}>{visit.bust ? 'přehoz' : visit.scored}</strong>
            <span className="history-darts">{visit.darts.map(dartLabel).join(' ')}</span></> : ''}</td>; })}</tr>)}</tbody></table>
  </section>;
}

function WinnerPanel({ state }: { state: X01State }) {
  const winner = state.players[state.winner!];
  return <section className="winner-panel card" role="status">
    <PlayerAvatar player={winner} size={84} />
    <div><span className="eyebrow orange">VÍTĚZ ZÁPASU</span><h2>{winner.name}</h2>
      <p className="muted">{state.players.map((player, i) => `${player.name} ${legCount(state.legsWon[i])} · průměr ${threeDartAverage(state, i).toFixed(1)}`).join('  ·  ')}</p></div>
    <span className="spacer"></span>
    <button className="primary big" onClick={rematch}>Odveta</button>
    <button onClick={endGame}>Nová hra</button>
  </section>;
}

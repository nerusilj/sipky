import { useEffect, useRef, useState } from 'react';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import Toggle from '../components/Toggle.tsx';
import { useConnection } from '../connection.ts';
import { suggestCheckout } from '../game/checkout.ts';
import { decideBullOffWinner, endGame, enterDart, nextPlayer, rematch, startGame, undoDart, useGame } from '../game/gameStore.ts';
import { dartLabel, DARTS_PER_VISIT, ENDLESS, isEndless, makeDart, NO_ROUND_LIMIT, threeDartAverage } from '../game/x01.ts';
import type { Dart, NextLegOrder, X01Settings, X01State } from '../game/x01.ts';
import { loadLastSetup, ROUND_LIMITS, saveLastSetup } from '../game/lastSetup.ts';
import { shuffle } from '../game/order.ts';
import type { Player } from '../players/playerList.ts';
import { usePlayers } from '../players/players.ts';

const MAX_GAME_PLAYERS = 8;
// ENDLESS = hra dokola, jinak počet vítězných legů, který ukončí zápas.
const LEG_OPTIONS = [ENDLESS, 1, 2, 3, 4, 5];

export default function GamePage({ startScore, onPlayers }: { startScore: 301 | 501; onPlayers: () => void }) {
  const { state } = useGame();
  return state ? <GameBoard state={state} /> : <GameSetup initialScore={startScore} onPlayers={onPlayers} />;
}

function legsText(n: number): string {
  if (n === ENDLESS) return 'Hra dokola';
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
  const [legOrder, setLegOrder] = useState<NextLegOrder>(last.nextLegOrder);
  const [maxRounds, setMaxRounds] = useState(last.maxRounds);
  const [minFinishers, setMinFinishers] = useState(last.minFinishers);
  useEffect(() => setScore(initialScore), [initialScore]);
  const toggle = (id: string) => setSelected(list => list.includes(id) ? list.filter(other => other !== id)
    : list.length < MAX_GAME_PLAYERS ? [...list, id] : list);
  // Vybraní hráči nahoře v pořadí hry, ostatní pod nimi abecedně.
  const chosen = selected.flatMap(id => players.filter(player => player.id === id));
  const others = players.filter(player => !selected.includes(player.id)).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  // Zavřít musí 1 až (počet hráčů − 1); zapamatovaná hodnota se omezí podle aktuálního výběru.
  const maxFinishers = Math.max(1, chosen.length - 1);
  const finishers = Math.min(minFinishers, maxFinishers);
  function start() {
    saveLastSetup({ playerIds: chosen.map(player => player.id), randomOrder, legsToWin, doubleOut, nextLegOrder: legOrder, maxRounds, minFinishers });
    const order = randomOrder ? shuffle(chosen) : chosen;
    if (order.length) startGame({ startScore: score, doubleOut, legsToWin, nextLegOrder: legOrder, maxRounds, minFinishers: finishers } satisfies X01Settings,
      order.map(({ id, name, color }) => ({ id, name, color })));
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
        <label>Konec zápasu
          <div className="segmented">{LEG_OPTIONS.map(n => <button key={n} className={legsToWin === n ? 'selected' : ''} onClick={() => setLegsToWin(n)}
            title={n === ENDLESS ? 'Hraje se dokola, legy se počítají, zápas nekončí' : `Vyhrává, kdo první vyhraje ${legCount(n)}`}>{n === ENDLESS ? '∞ Dokola' : n}</button>)}</div>
          <span className="small">{legsToWin === ENDLESS ? 'Legy se počítají, zápas ukončíte tlačítkem Konec hry.' : `Vyhrává, kdo první vyhraje ${legCount(legsToWin)}.`}</span></label>
        <label>Max. kol na leg
          <div className="segmented">{ROUND_LIMITS.map(n => <button key={n} className={maxRounds === n ? 'selected' : ''} onClick={() => setMaxRounds(n)}>
            {n === NO_ROUND_LIMIT ? 'Bez limitu' : n}</button>)}</div>
          <span className="small">{maxRounds === NO_ROUND_LIMIT ? 'Hraje se, dokud někdo nezavře.' : `Když po ${maxRounds}. kole nikdo nezavře, rozhodne rozhoz na střed.`}</span></label>
        {chosen.length >= 3 && <label>Zavřít musí
          <div className="segmented">{Array.from({ length: maxFinishers }, (_, i) => i + 1).map(n =>
            <button key={n} className={finishers === n ? 'selected' : ''} onClick={() => setMinFinishers(n)}>{n === 1 ? '1 hráč' : `${n} hráči`}</button>)}</div>
          <span className="small">{finishers === 1 ? 'Leg končí prvním zavřením.' : `Leg končí, až zavřou ${finishers} hráči; leg vyhrává první.`}</span></label>}
        <label>Další leg začíná
          <div className="segmented">
            <button className={legOrder === 'loserFirst' ? 'selected' : ''} onClick={() => setLegOrder('loserFirst')}>Od posledního</button>
            <button className={legOrder === 'rotate' ? 'selected' : ''} onClick={() => setLegOrder('rotate')}>Střídání</button>
          </div>
          <span className="small">{legOrder === 'loserFirst' ? 'První hází ten, komu zbylo nejvíc bodů; vítěz legu hází poslední.' : 'Pořadí zůstává, začíná vždy další hráč.'}</span></label>
        <Toggle checked={doubleOut} onChange={setDoubleOut}>Double Out (zavřít doublem nebo bullem)</Toggle>
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
    <PlayerAvatar player={player} size={40} /><span>{player.name}</span>
    {order === 'random' ? <b className="order check" aria-label="Hraje">✓</b> : active && <b className="order">{order + 1}</b>}</button>;
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
          {' · '}kolo {state.round}{settings.maxRounds ? ` z ${settings.maxRounds}` : ''}
          {state.finishersNeeded > 1 && ` · zavřít musí ${state.finishersNeeded}`}
          {' · '}<span className={connection.state === 'connected' ? 'online-text' : ''}>{connection.state === 'connected' ? 'šipky z terče' : 'terč nepřipojen'}</span></p></div>
      <div className="game-head-actions">
        {confirmEnd ? <><span className="muted small">Ukončit hru?</span><button className="danger" onClick={() => { setConfirmEnd(false); endGame(); }}>Ukončit</button>
          <button onClick={() => setConfirmEnd(false)}>Pokračovat</button></>
          : <button className="end-game" onClick={() => finished ? endGame() : setConfirmEnd(true)}>{finished ? 'Nová hra' : 'Konec hry'}</button>}
      </div>
    </div>
    {banner && <div className="leg-banner" role="status">{banner}</div>}
    {finished && <WinnerPanel state={state} />}
    {state.bullOff && !finished && <BullOffPanel state={state} />}
    {/* Karty v pořadí házení v aktuálním legu. */}
    <div className="game-players">{state.order.map(i => <PlayerScore key={players[i].id} state={state} index={i} />)}</div>
    {!finished && <div className="game-actions">
      <button onClick={undoDart} disabled={!state.history.length && !state.visit.length && state.leg === 1 && !state.bullOff}>↶ Zpět</button>
      {!state.bullOff && <button className={state.visitResult.closed ? 'primary' : ''} onClick={nextPlayer}>Další hráč ›</button>}
      <span className="spacer"></span>
      {!state.bullOff && <button aria-pressed={keypad} onClick={() => setKeypad(!keypad)}>{keypad ? 'Skrýt ruční zadání' : 'Ruční zadání'}</button>}
    </div>}
    {!finished && keypad && !state.bullOff && <Keypad disabled={state.visitResult.closed} />}
    <History state={state} />
  </div>;
}

// Krátké oznámení po zavření: „Jarda zavřel jako 1.“ během legu, po konci legu pořadí nebo vítěz
// (konec zápasu má vlastní panel). Jména v 1. pádě, ať jsou věty správně pro jakékoli jméno.
function useLegBanner(state: X01State): string | undefined {
  const legs = state.legsWon.reduce((a, b) => a + b, 0);
  const key = `${legs}/${state.finished.length}`;
  const previous = useRef({ legs, finished: state.finished.length });
  const [banner, setBanner] = useState<string>();
  useEffect(() => {
    const before = previous.current;
    previous.current = { legs, finished: state.finished.length };
    let text: string | undefined;
    if (legs > before.legs && state.winner === undefined && state.lastLegWinner !== undefined) {
      const places = state.lastLegPlaces ?? [state.lastLegWinner];
      text = places.length > 1 ? `Konec legu: ${places.map((p, i) => `${i + 1}. ${state.players[p].name}`).join(', ')}`
        : `Leg vyhrává ${state.players[state.lastLegWinner].name}!`;
      if (state.lastLegByBullOff) text += ' (rozhoz na střed)';
    } else if (legs === before.legs && state.finished.length > before.finished) {
      text = `${state.players[state.finished.at(-1)!].name} zavřel jako ${state.finished.length}.`;
    }
    if (!text) return;
    setBanner(text);
    const timer = window.setTimeout(() => setBanner(undefined), 3500);
    return () => window.clearTimeout(timer);
  }, [key]);
  return banner;
}

// Rozhoz na střed: kdo hází, co kdo hodil (i v předchozích kolech při shodě), zadání a ruční rozhodnutí.
function BullOffPanel({ state }: { state: X01State }) {
  const bullOff = state.bullOff!;
  const name = (p: number) => state.players[p].name;
  const place = state.finished.length + 1;
  return <section className="bulloff card" aria-labelledby="bulloff-title">
    <div className="bulloff-head">
      <div><span className="eyebrow orange">ROZHOZ NA STŘED{bullOff.round > 1 ? ` · ${bullOff.round}. KOLO (SHODA)` : ''}</span>
        <h2 id="bulloff-title">Hází {name(state.current)}</h2>
        <p className="muted small">Jedna šipka na střed. Bull je víc než 25, při shodě se hází znovu.{state.finishersNeeded > 1 ? ` Rozhoduje se o ${place}. místo.` : ''}</p></div>
    </div>
    <div className="bulloff-throws">{bullOff.contenders.map(p => {
      const thrown = bullOff.throws.find(t => t.player === p);
      return <div key={p} className={`bulloff-player ${p === state.current ? 'current' : ''}`}>
        <PlayerAvatar player={state.players[p]} size={36} /><strong>{name(p)}</strong>
        <span className="bulloff-dart">{thrown ? dartLabel(thrown.dart) : p === state.current ? 'hází…' : '–'}</span>
        <button className="text-button" onClick={() => decideBullOffWinner(p)} title="Určit vítěze rozhozu ručně">Vyhrál</button>
      </div>;
    })}</div>
    {bullOff.previous.length > 0 && <p className="muted small">Předchozí: {bullOff.previous.map(round => round.map(t => `${name(t.player)} ${dartLabel(t.dart)}`).join(', ')).join(' · ')}</p>}
    <div className="bulloff-keys">
      <button onClick={() => enterDart(makeDart(25, 2))}>Bull</button>
      <button onClick={() => enterDart(makeDart(25, 1))}>25</button>
      <button className="miss" onClick={() => enterDart(makeDart(0, 0))}>Mimo střed</button>
    </div>
  </section>;
}

function PlayerScore({ state, index }: { state: X01State; index: number }) {
  const player = state.players[index];
  const active = index === state.current && state.winner === undefined && !state.bullOff;
  const place = state.finished.indexOf(index);
  const lastVisit = [...state.history].reverse().find(visit => visit.player === index && visit.leg === state.leg);
  const darts: Dart[] = active ? state.visit : lastVisit?.darts ?? [];
  const result = active ? state.visitResult : lastVisit;
  const remaining = active ? state.visitResult.remaining : state.remaining[index];
  const dartsLeft = active ? DARTS_PER_VISIT - state.visit.length : DARTS_PER_VISIT;
  const checkout = state.settings.doubleOut && !(active && state.visitResult.closed) ? suggestCheckout(remaining, dartsLeft) : undefined;
  return <section className={`score-card card ${active ? 'active' : ''} ${state.winner === index ? 'winner' : ''} ${place >= 0 ? 'done' : ''}`} aria-label={player.name}>
    {place >= 0 && <span className="place-badge">{place + 1}. zavřel</span>}
    <div className="score-head">
      <PlayerAvatar player={player} size={52} />
      <div><strong>{player.name}</strong>
        {isEndless(state.settings)
          ? <span className="legs-count">Legy <b>{state.legsWon[index]}</b></span>
          : <span className="legs" aria-label={`Legy ${state.legsWon[index]}`}>{Array.from({ length: state.settings.legsToWin }, (_, i) =>
            <i key={i} className={i < state.legsWon[index] ? 'won' : ''} />)}</span>}</div>
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

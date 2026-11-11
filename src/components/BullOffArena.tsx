import { useLayoutEffect, useRef, useState } from 'react';
import Dartboard from './Dartboard.tsx';
import PlacementBadge from './PlacementBadge.tsx';
import PlayerName from './PlayerName.tsx';
import { CheckIcon, ChevronDownIcon, ChevronIcon, CloseIcon, PencilIcon } from './Icons.tsx';
import { bullThrowLabel, bullThrowNeedsDistance, bullThrowRequiresTakeout } from '../game/bullOffRanking.ts';
import { BULL_THROW_CHOICES } from '../game/x01.ts';
import type { BullOffReview, BullThrowChoice, X01State } from '../game/x01.ts';
import type { BoardPhase } from '../game/boardInput.ts';

export default function BullOffArena({ state, phase, busy, onCorrect }: {
  state: X01State; phase?: BoardPhase; busy: boolean; onCorrect: (player: number, round: number, choice: BullThrowChoice) => boolean;
}) {
  const bull = state.bullOff!;
  const list = useRef<HTMLOListElement>(null);
  const player = state.players[state.current];
  const live = state.visit[0];
  const [editing, setEditing] = useState<{ player: number; round: number }>();
  const roundHit = (p: number) => p === state.current && live ? live : bull.throws.find(hit => hit.player === p)?.dart;
  const selectedHit = editing?.round === bull.round ? roundHit(editing.player) : undefined;
  const participants = bull.ranking ? bull.previous[0]?.map(hit => hit.player) ?? bull.contenders : bull.contenders;
  const missing = !!live && bullThrowNeedsDistance(live);
  const status = phase === 'blocked' ? 'Nejdřív vyjměte šipky z terče.'
    : missing ? 'Terč neposlal vzdálenost. Opravte zásah tužkou nebo vraťte hod a opakujte ho.'
    : busy ? 'Vyhodnocuji hod…'
    : live && !player.bot && phase !== 'manual' && bullThrowRequiresTakeout(live) ? 'Vytáhněte šipku ze středu.'
    : !live && phase === 'takeout' ? 'Vytáhněte šipky, aby terč mohl přijmout další hod.' : '';
  useLayoutEffect(() => {
    const container = list.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container || !active) return;
    const top = active.offsetTop, bottom = top + active.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bottom > container.scrollTop + container.clientHeight) container.scrollTop = bottom - container.clientHeight;
  }, [state.current, bull.round, status]);
  return <section className="bull-arena" aria-label="Rozhoz na střed">
    <div className="bull-arena-board"><Dartboard darts={live ? [live] : []} /></div>
    <aside className="bull-arena-sidebar" aria-label="Hráči rozhozu">
      <header><h3>{bull.round > 1 ? `Rozstřel · ${bull.round}. kolo` : 'Pořadí hodů'}</h3>
        <span>{bull.contenders.indexOf(state.current) + 1} / {bull.contenders.length}</span></header>
      <ol ref={list} className="bull-participants">{participants.map(p => {
        const profile = state.players[p];
        const currentRoundHit = roundHit(p);
        const hit = currentRoundHit ?? bull.ranking?.results.find(item => item.player === p)?.dart;
        const resolved = bull.ranking?.ordered.includes(p);
        const active = p === state.current;
        const waitingForTieThrow = bull.round > 1 && bull.contenders.includes(p) && !bull.throws.some(item => item.player === p) && !(active && live);
        const shownHit = waitingForTieThrow ? undefined : hit;
        const label = active ? 'Na řadě' : waitingForTieThrow ? 'Rozstřel' : resolved ? 'Pořadí určeno' : hit ? 'Hozeno' : 'Čeká';
        return <li key={profile.id} className={`bull-player-card card ${active ? 'active' : ''}`} aria-current={active ? 'true' : undefined}>
          <div className="bull-player-identity"><PlayerName {...profile} avatarSeed={profile.id} avatarSize={48} className="plain" />
            <span className="bull-player-state">{resolved && <CheckIcon size={14} />}{label}</span></div>
          <div className="bull-hit-controls">
            <strong className="bull-participant-result" aria-label={shownHit ? `Zásah: ${bullThrowNeedsDistance(shownHit) ? 'vzdálenost nedostupná' : bullThrowLabel(shownHit)}` : 'Zatím neházeno'}>
              {shownHit && !bullThrowNeedsDistance(shownHit) ? bullThrowLabel(shownHit) : '—'}
            </strong>
            {currentRoundHit && (!active || !profile.bot) && <button className="icon-button bull-edit-hit" aria-label={`Opravit zásah hráče ${profile.name}`} title="Opravit zásah"
              aria-haspopup="dialog" disabled={busy} onClick={() => setEditing({ player: p, round: bull.round })}><PencilIcon size={19} /></button>}
          </div>
        </li>;
      })}</ol>
      {status && <p className="bull-arena-status" role={missing ? 'alert' : 'status'}>{status}</p>}
    </aside>
    {editing && selectedHit && <BullThrowKeypad name={state.players[editing.player].name} value={bullThrowLabel(selectedHit)} disabled={busy}
      onClose={() => setEditing(undefined)} onChoose={choice => { if (onCorrect(editing.player, editing.round, choice)) setEditing(undefined); }} />}
  </section>;
}

function BullThrowKeypad({ name, value, disabled = false, onChoose, onClose }: {
  name: string; value: string; disabled?: boolean; onChoose: (choice: BullThrowChoice) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="end-game-dialog bull-edit-dialog" aria-labelledby="bull-edit-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="end-dialog-body">
      <div className="bull-edit-heading"><h2 id="bull-edit-title">Opravit zásah</h2>
        <button className="icon-button" aria-label="Zavřít opravu zásahu" onClick={onClose}><CloseIcon size={22} /></button></div>
      <p>{name} · {value}</p>
      <div className="bull-throw-keys" role="group" aria-label="Správný zásah">
        {BULL_THROW_CHOICES.map(choice => <button key={choice} type="button" disabled={disabled}
          aria-pressed={value === choice} onClick={() => onChoose(choice)}>{choice}</button>)}
      </div>
    </div>
  </dialog>;
}

export function BullOffResults({ state, onContinue }: { state: X01State; onContinue: (review?: BullOffReview) => void }) {
  const result = state.lastBullOffResult!;
  const [review, setReview] = useState<BullOffReview>();
  const [editing, setEditing] = useState<number>();
  const places = review?.places ?? result.places;
  const firstEditable = result.closedPlayers.length;
  const hasChanges = review && (review.corrections.length > 0 || places.some((p, index) => p !== result.places[index]));
  const recordedHits = (player: number) => result.rounds.flat().filter(hit => hit.player === player).map(hit => bullThrowLabel(hit.dart));
  const hitLabels = (player: number) => {
    const hits = recordedHits(player);
    const fix = review?.corrections.find(item => item.player === player);
    if (fix && hits.length) hits[hits.length - 1] = fix.choice;
    return hits;
  };
  function move(index: number, step: number) {
    const target = index + step;
    if (!review || target < firstEditable || target >= places.length) return;
    const next = [...places];
    [next[index], next[target]] = [next[target], next[index]];
    setReview({ ...review, places: next });
  }
  function correct(choice: BullThrowChoice) {
    if (!review || editing === undefined) return;
    const corrections = review.corrections.filter(item => item.player !== editing);
    if (recordedHits(editing).at(-1) !== choice) corrections.push({ player: editing, choice });
    setReview({ ...review, corrections });
    setEditing(undefined);
  }
  return <section className="bull-results card" aria-labelledby="bull-results-title">
    <header><span className="eyebrow">LEG {result.leg} · ROZHOZ NA STŘED</span>
      <div className="bull-review-heading"><h2 id="bull-results-title">Konečné pořadí</h2>
        <button type="button" aria-pressed={!!review} onClick={() => setReview(review ? undefined : { places: [...result.places], corrections: [] })}>
          {review ? 'Zrušit úpravy' : 'Upravit výsledek'}
        </button></div>
      {review && <p className="muted small">Tužkou opravte poslední zásah, šipkami určete správné pořadí. Změny se zapíšou po potvrzení.</p>}
    </header>
    <ol>{places.map((p, index) => {
      const profile = state.players[p];
      const editable = index >= firstEditable;
      return <li key={profile.id}><PlacementBadge place={index + 1} /><PlayerName {...profile} avatarSeed={profile.id} avatarSize={42} className="plain" />
        <span className="bull-final-result">{editable ? hitLabels(p).join(' → ') : 'Zavřeno na nulu'}</span>
        {review && editable && <div className="bull-review-actions">
          <button className="icon-button" aria-label={`Opravit zásah hráče ${profile.name}`} title="Opravit poslední zásah" aria-haspopup="dialog"
            onClick={() => setEditing(p)}><PencilIcon size={19} /></button>
          <button className="icon-button bull-move-up" aria-label={`Posunout hráče ${profile.name} nahoru`} title="Posunout nahoru"
            disabled={index === firstEditable} onClick={() => move(index, -1)}><ChevronDownIcon size={19} /></button>
          <button className="icon-button" aria-label={`Posunout hráče ${profile.name} dolů`} title="Posunout dolů"
            disabled={index === places.length - 1} onClick={() => move(index, 1)}><ChevronDownIcon size={19} /></button>
        </div>}
      </li>;
    })}</ol>
    <button className="primary" onClick={() => onContinue(hasChanges ? review : undefined)}>{hasChanges ? 'Potvrdit a pokračovat'
      : state.winner === undefined ? 'Pokračovat na další leg' : 'Zobrazit výsledek zápasu'}<ChevronIcon size={21} /></button>
    {review && editing !== undefined && <BullThrowKeypad name={state.players[editing].name} value={hitLabels(editing).at(-1) ?? '—'}
      onClose={() => setEditing(undefined)} onChoose={correct} />}
  </section>;
}

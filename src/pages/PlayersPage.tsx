import { useState } from 'react';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import { MAX_NAME_LENGTH, nameError } from '../players/playerList.ts';
import type { Player } from '../players/playerList.ts';
import { changePlayerName, createPlayer, deletePlayer, usePlayers } from '../players/players.ts';

export default function PlayersPage() {
  const { loaded, readOnly, players, error } = usePlayers();
  const [name, setName] = useState('');
  const [addError, setAddError] = useState('');
  function add() {
    try { createPlayer(name); setName(''); setAddError(''); }
    catch (e) { setAddError(e instanceof Error ? e.message : String(e)); }
  }
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return <div className="page">
    <div className="page-heading"><div><h1>Hráči</h1><p>{players.length ? `${players.length} ${players.length === 1 ? 'hráč' : players.length < 5 ? 'hráči' : 'hráčů'}` : 'Zatím žádní hráči.'}</p></div></div>
    {error && <div className="notice" role="alert"><span>{error}</span></div>}
    <section className="settings-card card add-player" aria-labelledby="add-title">
      <h2 id="add-title">Přidat hráče</h2>
      <div className="settings-row">
        <input value={name} maxLength={MAX_NAME_LENGTH} placeholder="Jméno hráče" aria-labelledby="add-title" disabled={readOnly}
          onChange={event => { setName(event.target.value); setAddError(''); }} onKeyDown={event => { if (event.key === 'Enter') add(); }} />
        <button className="primary" onClick={add} disabled={readOnly || !name.trim()}>+ Přidat</button>
      </div>
      {addError && <p className="field-error">{addError}</p>}
    </section>
    {!loaded ? <p className="muted">Načítám hráče…</p> : sorted.length === 0 ? <div className="card coming-soon">
      <p>Přidejte prvního hráče.</p></div>
      : <ul className="player-grid">{sorted.map(player => <PlayerCard key={player.id} player={player} players={players} readOnly={readOnly} />)}</ul>}
  </div>;
}

function PlayerCard({ player, players, readOnly }: { player: Player; players: readonly Player[]; readOnly: boolean }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  const [draft, setDraft] = useState(player.name);
  const error = mode === 'rename' && draft.trim() !== player.name ? nameError(players, draft, player.id) : undefined;
  function save() {
    if (draft.trim() === player.name) { setMode('view'); return; }
    if (error) return;
    changePlayerName(player.id, draft); setMode('view');
  }
  return <li className={`player-card card ${mode === 'delete' ? 'deleting' : ''}`}>
    <PlayerAvatar player={{ name: mode === 'rename' && draft.trim() ? draft : player.name, color: player.color }} />
    {mode === 'rename' ? <div className="player-edit">
      <input value={draft} maxLength={MAX_NAME_LENGTH} autoFocus aria-label={`Nové jméno pro ${player.name}`}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') save(); if (event.key === 'Escape') { setDraft(player.name); setMode('view'); } }} />
      {error && <p className="field-error">{error}</p>}
      <div className="player-actions"><button className="primary" onClick={save} disabled={!!error}>Uložit</button>
        <button onClick={() => { setDraft(player.name); setMode('view'); }}>Zrušit</button></div>
    </div> : mode === 'delete' ? <div className="player-edit">
      <strong>Smazat hráče {player.name}?</strong>
      <div className="player-actions"><button className="danger" onClick={() => deletePlayer(player.id)}>Smazat</button>
        <button onClick={() => setMode('view')}>Ponechat</button></div>
    </div> : <>
      <strong className="player-name">{player.name}</strong>
      <span className="muted small">Přidán {new Date(player.createdAt).toLocaleDateString('cs-CZ')}</span>
      <div className="player-actions">
        <button className="text-button" disabled={readOnly} onClick={() => { setDraft(player.name); setMode('rename'); }}>Přejmenovat</button>
        <button className="text-button" disabled={readOnly} onClick={() => setMode('delete')}>Smazat</button>
      </div>
    </>}
  </li>;
}

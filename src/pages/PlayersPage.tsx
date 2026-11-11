import AvatarPicker from '../components/AvatarPicker.tsx';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import type { AvatarId } from '../players/avatars.ts';
import PlayerName from '../components/PlayerName.tsx';
import { useEffect, useRef, useState } from 'react';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/Icons.tsx';
import { MAX_NAME_LENGTH, nameError } from '../players/playerList.ts';
import type { Player } from '../players/playerList.ts';
import { changePlayerProfile, createPlayer, deletePlayer, usePlayers } from '../players/players.ts';

export default function PlayersPage() {
  const { loaded, readOnly, players, error } = usePlayers();
  const [name, setName] = useState('');
  const [addError, setAddError] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('neutral');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addOpen) input.current?.focus(); }, [addOpen]);
  function add() {
    try { createPlayer(name, avatarId); setName(''); setAvatarId('neutral'); setAddError(''); input.current?.focus(); }
    catch (e) { setAddError(e instanceof Error ? e.message : String(e)); }
  }
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const searchKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');
  const matching = sorted.filter(player => searchKey(player.name).includes(searchKey(query)));
  return <div className="page players-page">
    <div className="page-heading"><div><span className="eyebrow">VAŠE SESTAVA</span><h1>Hráči <span className="roster-count">{players.length}</span></h1><p>Vyberte hráči avatar nebo iniciály. Ve hře ho poznáte na první pohled.</p></div>
      <button className="primary roster-add" aria-expanded={addOpen || !players.length} aria-controls="create-player-panel" onClick={() => setAddOpen(open => !open)} disabled={readOnly}><PlusIcon size={19} />Přidat hráče</button>
    </div>
    {error && <div className="notice" role="alert"><span>{error}</span></div>}
    {(addOpen || !players.length) && <section id="create-player-panel" className="settings-card card add-player" aria-labelledby="add-title">
      <h2 id="add-title">Přidat hráče</h2>
      <div className="new-player-identity"><PlayerAvatar player={{ name: name || 'Hráč', color: '#86b9d6', avatarId }} size={72} /><div className="settings-row">
        <input ref={input} value={name} maxLength={MAX_NAME_LENGTH} placeholder="Jméno hráče" aria-labelledby="add-title" disabled={readOnly}
          onChange={event => { setName(event.target.value); setAddError(''); }} onKeyDown={event => { if (event.key === 'Enter') add(); }} />
        <button className="primary" onClick={add} disabled={readOnly || !name.trim()}><PlusIcon size={18} />Přidat</button>
      </div>
      </div>
      <AvatarPicker name={name} value={avatarId} onChange={setAvatarId} disabled={readOnly} />
      {addError && <p className="field-error">{addError}</p>}
    </section>}
    {players.length > 0 && <label className="players-search"><SearchIcon size={20} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Vyhledat hráče" aria-label="Vyhledat hráče" /></label>}
    {!loaded ? <p className="muted">Načítám hráče…</p> : sorted.length === 0 ? <div className="card coming-soon">
      <p>Přidejte prvního hráče.</p></div>
      : <ul className="player-grid roster-list" aria-label="Správa hráčů">{matching.map(player => <PlayerCard key={player.id} player={player} players={players} readOnly={readOnly} />)}</ul>}
    {loaded && players.length > 0 && !matching.length && <p className="search-empty" role="status">Žádný hráč neodpovídá hledání.</p>}
  </div>;
}

function PlayerCard({ player, players, readOnly }: { player: Player; players: readonly Player[]; readOnly: boolean }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  const [draft, setDraft] = useState(player.name);
  const [draftAvatar, setDraftAvatar] = useState<AvatarId | undefined>(player.avatarId);
  const error = mode === 'rename' && draft.trim() !== player.name ? nameError(players, draft, player.id) : undefined;
  function save() {
    if (draft.trim() === player.name && draftAvatar === player.avatarId) { setMode('view'); return; }
    if (error) return;
    changePlayerProfile(player.id, draft, draftAvatar); setMode('view');
  }
  return <li className={`player-card card ${mode === 'delete' ? 'deleting' : ''}`}>
    <PlayerName name={mode === 'rename' && draft.trim() ? draft : player.name} color={player.color} avatarSeed={player.id} avatarId={mode === 'rename' ? draftAvatar : player.avatarId} avatarSize={58} />
    {mode === 'rename' ? <div className="player-edit">
      <input value={draft} maxLength={MAX_NAME_LENGTH} autoFocus aria-label={`Nové jméno pro ${player.name}`}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') save(); if (event.key === 'Escape') { setDraft(player.name); setMode('view'); } }} />
      <AvatarPicker name={draft} value={draftAvatar} onChange={setDraftAvatar} disabled={readOnly} />
      {error && <p className="field-error">{error}</p>}
      <div className="player-actions"><button className="primary" onClick={save} disabled={!!error}>Uložit</button>
        <button onClick={() => { setDraft(player.name); setMode('view'); }}>Zrušit</button></div>
    </div> : mode === 'delete' ? <div className="player-edit">
      <strong>Smazat hráče <PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} />?</strong>
      <div className="player-actions"><button className="danger" onClick={() => deletePlayer(player.id)}>Smazat</button>
        <button onClick={() => setMode('view')}>Ponechat</button></div>
    </div> : <>
      {!readOnly && <div className="player-icons">
        <button className="icon-action" title="Upravit hráče" aria-label={`Upravit hráče ${player.name}`}
          onClick={() => { setDraft(player.name); setDraftAvatar(player.avatarId); setMode('rename'); }}><PencilIcon size={16} /></button>
        <button className="icon-action delete" title="Smazat" aria-label={`Smazat hráče ${player.name}`}
          onClick={() => setMode('delete')}><TrashIcon size={16} /></button>
      </div>}
    </>}
  </li>;
}

import AvatarPicker from '../components/AvatarPicker.tsx';
import PlayerAvatar from '../components/PlayerAvatar.tsx';
import type { AvatarId } from '../players/avatars.ts';
import PlayerName from '../components/PlayerName.tsx';
import { useEffect, useRef, useState } from 'react';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/Icons.tsx';
import { FINISHING_DOUBLES, MAX_NAME_LENGTH, nameError } from '../players/playerList.ts';
import type { Player } from '../players/playerList.ts';
import { changePlayerProfile, createPlayer, deletePlayer, usePlayers } from '../players/players.ts';

export default function PlayersPage() {
  const { loaded, readOnly, players, error } = usePlayers();
  const [name, setName] = useState('');
  const [addError, setAddError] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('neutral');
  const [color, setColor] = useState<string>();
  const [preferredDouble, setPreferredDouble] = useState<number>();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addOpen) input.current?.focus(); }, [addOpen]);
  function cancelAdd() {
    setName(''); setAvatarId('neutral'); setColor(undefined); setPreferredDouble(undefined); setAddError(''); setAddOpen(false);
  }
  function add() {
    try {
      createPlayer(name, avatarId, preferredDouble, color);
      setName(''); setAvatarId('neutral'); setColor(undefined); setPreferredDouble(undefined); setAddError(''); input.current?.focus();
    }
    catch (e) { setAddError(e instanceof Error ? e.message : String(e)); }
  }
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const searchKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');
  const matching = sorted.filter(player => searchKey(player.name).includes(searchKey(query)));
  return <div className="page players-page">
    <div className="page-heading"><div><span className="eyebrow">VAŠE SESTAVA</span><h1>Hráči <span className="roster-count">{players.length}</span></h1><p>Vyberte hráči avatar nebo iniciály. Ve hře ho poznáte na první pohled.</p></div>
      <button className="primary roster-add" aria-expanded={addOpen} aria-controls="create-player-panel" onClick={() => setAddOpen(open => !open)} disabled={readOnly}><PlusIcon size={19} />Přidat hráče</button>
    </div>
    {error && <div className="notice" role="alert"><span>{error}</span></div>}
    {addOpen && <form id="create-player-panel" className="settings-card card add-player profile-form" aria-labelledby="add-title" onSubmit={event => { event.preventDefault(); add(); }}>
      <h2 id="add-title">Přidat hráče</h2>
      <div className="profile-fields"><PlayerAvatar player={{ name: name || 'Hráč', avatarColor: color, avatarId }} size={56} />
        <label className="profile-name">Jméno hráče
          <input ref={input} value={name} maxLength={MAX_NAME_LENGTH} placeholder="Jméno hráče" disabled={readOnly}
            onChange={event => { setName(event.target.value); setAddError(''); }} />
        </label>
        <FavoriteDoubleField value={preferredDouble} onChange={setPreferredDouble} disabled={readOnly} />
      </div>
      <AvatarPicker name={name} value={avatarId} onChange={setAvatarId} color={color} onColorChange={setColor} disabled={readOnly} />
      {addError && <p className="field-error">{addError}</p>}
      <div className="profile-actions">
        <button type="button" onClick={cancelAdd}>Zrušit</button>
        <button type="submit" className="primary" disabled={readOnly || !name.trim()}><PlusIcon size={18} />Přidat hráče</button>
      </div>
    </form>}
    {players.length > 0 && <label className="players-search"><SearchIcon size={20} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Vyhledat hráče" aria-label="Vyhledat hráče" /></label>}
    {!loaded ? <p className="muted">Načítám hráče…</p> : sorted.length === 0 ? <div className="card coming-soon">
      <p>Přidejte prvního hráče.</p></div>
      : <ul className="player-grid roster-list" aria-label="Správa hráčů">{matching.map(player => <PlayerRow key={player.id} player={player} players={players} readOnly={readOnly} />)}</ul>}
    {loaded && players.length > 0 && !matching.length && <p className="search-empty" role="status">Žádný hráč neodpovídá hledání.</p>}
  </div>;
}

function doubleLabel(double: number) {
  return double === 25 ? 'BULL' : `D${double}`;
}

function FavoriteDoubleField({ value, onChange, disabled }: {
  value?: number; onChange: (value: number | undefined) => void; disabled: boolean;
}) {
  return <label className="favorite-double-field">
    Oblíbený double
    <select value={value ?? ''} onChange={event => onChange(Number(event.target.value) || undefined)} disabled={disabled}>
      <option value="">Bez preference</option>
      {FINISHING_DOUBLES.map(double => <option key={double} value={double}>{doubleLabel(double)}</option>)}
    </select>
  </label>;
}

function PlayerRow({ player, players, readOnly }: { player: Player; players: readonly Player[]; readOnly: boolean }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  const [draft, setDraft] = useState(player.name);
  const [draftAvatar, setDraftAvatar] = useState<AvatarId | undefined>(player.avatarId);
  const [draftColor, setDraftColor] = useState(player.avatarColor);
  const [draftDouble, setDraftDouble] = useState(player.preferredDouble);
  const error = mode === 'rename' && draft.trim() !== player.name ? nameError(players, draft, player.id) : undefined;
  function save() {
    if (draft.trim() === player.name && draftAvatar === player.avatarId && draftColor === player.avatarColor && draftDouble === player.preferredDouble) { setMode('view'); return; }
    if (error) return;
    changePlayerProfile(player.id, draft, draftAvatar, draftDouble ?? null, draftColor ?? null); setMode('view');
  }
  return <li className={`player-card card ${mode === 'delete' ? 'deleting' : ''} ${mode === 'rename' ? 'editing' : ''}`}>
    {mode !== 'rename' && <PlayerName {...player} avatarSeed={player.id} avatarSize={36} />}
    {mode === 'rename' ? <form className="profile-form" aria-label={`Upravit hráče ${player.name}`}
      onSubmit={event => { event.preventDefault(); save(); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setMode('view'); } }}>
      <h2>Upravit hráče</h2>
      <div className="profile-fields">
        <PlayerAvatar player={{ ...player, name: draft, avatarId: draftAvatar, avatarColor: draftColor }} size={56} />
        <label className="profile-name">Jméno hráče
          <input value={draft} maxLength={MAX_NAME_LENGTH} autoFocus disabled={readOnly}
            onChange={event => setDraft(event.target.value)} />
        </label>
        <FavoriteDoubleField value={draftDouble} onChange={setDraftDouble} disabled={readOnly} />
      </div>
      <AvatarPicker name={draft} value={draftAvatar} onChange={setDraftAvatar} color={draftColor} onColorChange={setDraftColor} disabled={readOnly} />
      {error && <p className="field-error">{error}</p>}
      <div className="profile-actions">
        <button type="button" onClick={() => setMode('view')}>Zrušit</button>
        <button type="submit" className="primary" disabled={readOnly || !!error}>Uložit</button>
      </div>
    </form> : mode === 'delete' ? <div className="player-edit">
      <strong>Smazat hráče <PlayerName {...player} avatarSeed={player.id} />?</strong>
      <div className="player-actions"><button className="danger" onClick={() => deletePlayer(player.id)}>Smazat</button>
        <button onClick={() => setMode('view')}>Ponechat</button></div>
    </div> : <>
      <dl className="roster-double">
        <dt>Oblíbený double</dt>
        <dd>{player.preferredDouble === undefined ? 'Bez preference' : doubleLabel(player.preferredDouble)}</dd>
      </dl>
      {!readOnly && <div className="player-icons">
        <button className="icon-action" title="Upravit hráče" aria-label={`Upravit hráče ${player.name}`}
          onClick={() => { setDraft(player.name); setDraftAvatar(player.avatarId); setDraftColor(player.avatarColor); setDraftDouble(player.preferredDouble); setMode('rename'); }}><PencilIcon size={16} /></button>
        <button className="icon-action delete" title="Smazat" aria-label={`Smazat hráče ${player.name}`}
          onClick={() => setMode('delete')}><TrashIcon size={16} /></button>
      </div>}
    </>}
  </li>;
}

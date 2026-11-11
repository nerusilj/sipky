import SegmentedControl from './SegmentedControl.tsx';
import { BOT_LEVELS, BOT_PLAYERS } from '../game/bots.ts';
import AvatarPicker from './AvatarPicker.tsx';
import PlayerAvatar from './PlayerAvatar.tsx';
import type { AvatarId } from '../players/avatars.ts';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon } from './Icons.tsx';
import PlayerName from './PlayerName.tsx';
import { MAX_NAME_LENGTH, nameError, normalizeName } from '../players/playerList.ts';
import { createPlayer, usePlayers } from '../players/players.ts';

const searchKey = (value: string) => normalizeName(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');

export default function GamePlayerDialog({ selected, limit, onAdd, onClose }: {
  selected: readonly string[]; limit: number; onAdd: (id: string) => void; onClose: () => void;
}) {
  const { players, loaded, readOnly, error } = usePlayers();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'players' | 'bots'>('players');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [createError, setCreateError] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('neutral');
  const name = normalizeName(query);
  const full = selected.length >= limit;
  const matches = [...players].filter(player => searchKey(player.name).includes(searchKey(query)))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const canCreate = !!name && !nameError(players, name);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    search.current?.focus();
    return () => { element?.close(); };
  }, []);
  const close = () => { dialog.current?.close(); onClose(); };
  function add(player: { id: string; name: string }) {
    if (full || selected.includes(player.id)) return;
    onAdd(player.id);
    setQuery('');
    setAvatarId('neutral');
    setCreateError('');
    setNotice(`Hráč ${player.name} byl přidán do hry.`);
    search.current?.focus();
  }
  function create() {
    if (full || readOnly || !canCreate) return;
    try {
      const player = createPlayer(name, avatarId);
      add(player);
    } catch (error) { setCreateError(error instanceof Error ? error.message : String(error)); }
  }
  return <dialog ref={dialog} id="game-player-dialog" className="game-player-dialog" aria-labelledby="game-player-title"
    aria-describedby="game-player-hint" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="player-picker-heading"><div><h2 id="game-player-title">Přidat hráče</h2>
      <p id="game-player-hint">Přidejte hráče nebo bota do sestavy.</p></div>
      <button className="icon-button" aria-label="Zavřít výběr hráčů" title="Zavřít" onClick={close}><CloseIcon size={24} /></button>
    </div>
    <SegmentedControl className="player-picker-tabs" label="Typ soupeře" value={tab} onChange={setTab}
      options={[{ value: 'players', label: 'Hráči' }, { value: 'bots', label: 'Bot' }]} />
    {tab === 'players' && <div className="player-picker-search"><SearchIcon size={21} /><input ref={search} type="search" value={query} maxLength={MAX_NAME_LENGTH}
      aria-label="Vyhledat nebo vytvořit hráče" placeholder="Vyhledat nebo vytvořit hráče" autoComplete="off"
      onChange={event => { setQuery(event.target.value); setCreateError(''); setNotice(''); }} /></div>}
    {tab === 'players' && error && <p className="player-picker-error" role="alert">{error}</p>}
    {tab === 'players' && createError && <p className="player-picker-error" role="alert">{createError}</p>}
    <div className="player-picker-list">
      {tab === 'bots' ? <ul className="bot-picker-list" aria-label="Obtížnost bota">{BOT_LEVELS.map((level, index) => {
        const bot = BOT_PLAYERS[index], added = selected.includes(bot.id);
        return <li key={level.id} className={added ? 'is-added' : ''}>
          <div className="bot-picker-description"><PlayerName {...bot} avatarSeed={bot.id} avatarSize={48} /><span><strong>{level.label}</strong> · {level.description}</span></div>
          <button className={added ? 'player-picker-added' : 'primary'} disabled={added || full} aria-label={`Přidat bota: ${level.label}`} onClick={() => add(bot)}>
            {added ? <><CheckIcon size={18} />Ve hře</> : <><PlusIcon size={18} />Přidat</>}
          </button>
        </li>;
      })}</ul> : <>

      {!loaded ? <p className="player-picker-empty">Načítám hráče…</p> : <>
        {matches.length > 0 && <ul aria-label="Seznam hráčů">{matches.map(player => {
          const added = selected.includes(player.id);
          return <li key={player.id} className={added ? 'is-added' : ''}>
            <PlayerName name={player.name} color={player.color} avatarSeed={player.id} avatarId={player.avatarId} avatarSize={48} />
            <button className={added ? 'player-picker-added' : 'primary'} disabled={added || full}
              aria-label={added ? `${player.name} je ve hře` : `Přidat hráče ${player.name}`} onClick={() => add(player)}>
              {added ? <><CheckIcon size={18} />Ve hře</> : <><PlusIcon size={18} />Přidat</>}
            </button>
          </li>;
        })}</ul>}
        {!matches.length && <p className="player-picker-empty">{name ? 'Žádný hráč neodpovídá hledání.' : 'Zatím tu nejsou žádní hráči. Napište jméno a vytvořte prvního.'}</p>}
        {canCreate && <div className="player-picker-new">
          <div className="player-picker-create"><div className="new-player-identity"><PlayerAvatar player={{ name, color: '#86b9d6', avatarId }} size={54} /><div><strong>{name}</strong><span>Nový hráč</span></div></div>
            <button className="primary" disabled={readOnly || full} onClick={create}><PlusIcon size={18} />Vytvořit a přidat</button></div>
          <AvatarPicker name={name} value={avatarId} onChange={setAvatarId} disabled={readOnly || full} />
        </div>}
      </>}
      </>}
    </div>
    <div className="player-picker-footer"><div><span className="player-picker-count">Ve hře <strong>{selected.length}<span> / {limit}</span></strong></span>
      <p role="status" aria-live="polite">{full ? `Ve hře může být nejvýše ${limit} hráčů.` : notice}</p></div>
      <button className="primary" onClick={close}>Hotovo</button>
    </div>
  </dialog>;
}

import SegmentedControl from './SegmentedControl.tsx';
import { useEffect, useState } from 'react';
import { AVATARS } from '../players/avatars.ts';
import type { AvatarCategory, AvatarId } from '../players/avatars.ts';
import { PLAYER_PALETTE } from '../players/playerList.ts';
import AvatarArt from './AvatarArt.tsx';
import { CheckIcon } from './Icons.tsx';

export default function AvatarPicker({ value, onChange, color, onColorChange, name = '', disabled = false }: {
  name?: string; value?: AvatarId; onChange: (value: AvatarId) => void;
  color?: string; onColorChange: (color: string | undefined) => void; disabled?: boolean;
}) {
  const [category, setCategory] = useState<AvatarCategory>(AVATARS.find(avatar => avatar.id === value)?.category ?? 'neutral');
  useEffect(() => { setCategory(AVATARS.find(avatar => avatar.id === value)?.category ?? 'neutral'); }, [value]);
  return <fieldset className="avatar-picker" disabled={disabled}>
    <legend>Avatar</legend>
    <SegmentedControl className="avatar-category-tabs" label="Kategorie avatarů" value={category} onChange={setCategory} disabled={disabled}
      options={[{ value: 'neutral', label: 'Základní' }, { value: 'portraits', label: 'Portréty' }, { value: 'funny', label: 'Zábavné' }]} />
    <div className="avatar-options" role="group" aria-label="Výběr avataru">
      {AVATARS.filter(avatar => avatar.category === category).map(avatar => <button type="button" key={avatar.id} className="avatar-option" aria-label={`Avatar ${avatar.name}`} aria-pressed={value === avatar.id} onClick={() => onChange(avatar.id)}>
        <span className="avatar-option-art"><AvatarArt avatarId={avatar.id} name={name} color={color} /></span><span>{avatar.name}</span>{value === avatar.id && <span className="avatar-option-check"><CheckIcon size={14}/></span>}
      </button>)}
    </div>
    {!value && <p className="avatar-selection">Současný automatický portrét</p>}
    {(value === 'neutral' || value === 'initials') && <fieldset className="avatar-colors">
      <legend>Barva avatara</legend>
      <div className="avatar-color-options">
        <button type="button" className="avatar-color" aria-label="Bez barvy" title="Bez barvy"
          aria-pressed={color === undefined} onClick={() => onColorChange(undefined)}>
          <span style={{ backgroundColor: '#56616e', color: '#eef2f6' }} aria-hidden="true">
            {color === undefined && <CheckIcon size={15} />}
          </span>
        </button>
        {PLAYER_PALETTE.map(option => <button type="button" key={option.color} className="avatar-color"
          aria-label={option.name} title={option.name} aria-pressed={color?.toLowerCase() === option.color}
          onClick={() => onColorChange(option.color)}>
          <span style={{ backgroundColor: option.color }} aria-hidden="true">
            {color?.toLowerCase() === option.color && <CheckIcon size={15} />}
          </span>
        </button>)}
      </div>
    </fieldset>}
  </fieldset>;
}

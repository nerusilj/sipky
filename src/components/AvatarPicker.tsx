import SegmentedControl from './SegmentedControl.tsx';
import { useEffect, useState } from 'react';
import { AVATARS } from '../players/avatars.ts';
import type { AvatarCategory, AvatarId } from '../players/avatars.ts';
import AvatarArt from './AvatarArt.tsx';
import { CheckIcon } from './Icons.tsx';

export default function AvatarPicker({ value, onChange, name = '', disabled = false }: { name?: string; value?: AvatarId; onChange: (value: AvatarId) => void; disabled?: boolean }) {
  const [category, setCategory] = useState<AvatarCategory>(AVATARS.find(avatar => avatar.id === value)?.category ?? 'neutral');
  useEffect(() => { setCategory(AVATARS.find(avatar => avatar.id === value)?.category ?? 'neutral'); }, [value]);
  return <fieldset className="avatar-picker" disabled={disabled}>
    <legend>Avatar</legend>
    <SegmentedControl className="avatar-category-tabs" label="Kategorie avatarů" value={category} onChange={setCategory} disabled={disabled}
      options={[{ value: 'neutral', label: 'Základní' }, { value: 'portraits', label: 'Portréty' }, { value: 'funny', label: 'Funny' }]} />
    <div className="avatar-options" role="group" aria-label="Výběr avataru">
      {AVATARS.filter(avatar => avatar.category === category).map(avatar => <button type="button" key={avatar.id} className="avatar-option" aria-label={`Avatar ${avatar.name}`} aria-pressed={value === avatar.id} onClick={() => onChange(avatar.id)}>
        <span className="avatar-option-art"><AvatarArt avatarId={avatar.id} name={name} /></span><span>{avatar.name}</span>{value === avatar.id && <span className="avatar-option-check"><CheckIcon size={14}/></span>}
      </button>)}
    </div>
    <p className="avatar-selection" role="status">{value ? `Vybráno: ${AVATARS.find(avatar => avatar.id === value)?.name}` : 'Současný automatický portrét'}</p>
  </fieldset>;
}

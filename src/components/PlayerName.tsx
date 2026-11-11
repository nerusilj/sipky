import type { AvatarId } from '../players/avatars.ts';
import PlayerAvatar from './PlayerAvatar.tsx';

// Stejný portrét a styl jména na všech obrazovkách.
export default function PlayerName({ name, color, avatarSeed, avatarId, className = '', avatarSize = 44 }: { name: string; color?: string; avatarSeed?: string; avatarId?: AvatarId; className?: string; avatarSize?: number }) {
  return <span className={`player-tag plain ${color ? 'with-avatar' : ''} ${className}`} title={name} style={color ? { height: avatarSize } : undefined}>
    {color && <PlayerAvatar player={{ id: avatarSeed, avatarId, name, color }} size={avatarSize} />}
    <span className="player-tag-text"><span className="player-tag-label">{name}</span></span>
  </span>;
}

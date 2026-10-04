import type { CSSProperties } from 'react';
import { initials } from '../players/playerList.ts';
import type { Player } from '../players/playerList.ts';

export default function PlayerAvatar({ player, size = 56 }: { player: Pick<Player, 'name' | 'color'>; size?: number }) {
  return <span className="player-avatar" aria-hidden="true"
    style={{ '--avatar': player.color, width: size, height: size, fontSize: size * 0.38 } as CSSProperties}>{initials(player.name)}</span>;
}

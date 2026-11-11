import AvatarArt from './AvatarArt.tsx';
import { botAvatarColor, readAvatarId } from '../players/avatars.ts';
import type { Player } from '../players/playerList.ts';

// Stejné id vždy dostane stejný portrét, i po přejmenování hráče.
function avatarHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) { hash ^= character.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 16;
  return hash >>> 0;
}
const palettes = [
  ['#324956', '#c2d7df', '#202c39', '#718d9e'],
  ['#3e4e47', '#d9d2ba', '#293632', '#82968a'],
  ['#514640', '#dfc9b5', '#302c2c', '#a18c7d'],
  ['#454558', '#d4cedd', '#292b3c', '#8d8da6'],
  ['#3d4d55', '#d4d9d5', '#293039', '#82999c'],
] as const;
const hairShapes = [
  'M20 28V23a12 12 0 0 1 24 0v4l-4-4-5-2-7 3-8 4Z',
  'M20 27V23a12 12 0 0 1 24 0v5l-4-8-16 3-4 4Z',
  'M20 29V23a12 12 0 0 1 24 0v5l-6-7-3 6-8-5-7 7Z',
  'M20 27V23a12 12 0 0 1 24 0v4h-3v-5H23v5h-3Z',
  'M19 30V22c0-9 10-15 18-11 6 2 9 8 8 16l-4 4-1-9-6-4c-2 6-7 8-12 8l-3 4Z',
  'M20 28V23a12 12 0 0 1 24 0v6l-4-6-3-4-13 4-4 5Z',
];

export default function PlayerAvatar({ player, size = 44 }: { player: Pick<Player, 'name' | 'color'> & Partial<Pick<Player, 'id' | 'avatarId'>>; size?: number }) {
  const avatarId = readAvatarId(player.avatarId);
  if (avatarId) return <span className="player-avatar portrait-avatar" aria-hidden="true" style={{ width: size, height: size }}><AvatarArt avatarId={avatarId} name={player.name} robotColor={botAvatarColor(player.id)} /></span>;
  const hash = avatarHash(player.id ?? player.name.normalize('NFC').toLocaleLowerCase('cs'));
  const [background, skin, hair, shirt] = palettes[hash % palettes.length];
  const style = (hash >>> 5) % 8;
  const glasses = ((hash >>> 9) % 4) === 0;
  const beard = style < 4 && ((hash >>> 12) % 3) === 0;
  return <span className="player-avatar portrait-avatar" aria-hidden="true" style={{ width: size, height: size }}>
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" fill={background} />
      <circle cx="47" cy="13" r="24" fill="#fff" opacity=".035" />
      {style === 4 && <path d="M18 26c0-21 28-21 28 0v25H18V26Z" fill={hair} />}
      <path d="M8 64v-5c0-10 11-15 24-15s24 5 24 15v5H8Z" fill={shirt} />
      <path d="m24 46 8 9 8-9" stroke={background} strokeWidth="2" strokeLinejoin="round" />
      <rect x="27" y="37" width="10" height="13" rx="4" fill={skin} />
      <circle cx="20" cy="31" r="3" fill={skin} /><circle cx="44" cy="31" r="3" fill={skin} />
      <rect x="21" y="14" width="22" height="30" rx={style % 2 ? 10 : 12} fill={skin} />
      {style < 6 && <path d={hairShapes[style]} fill={hair} />}
      {style === 6 && <path d="M20 30V25M44 25v5" stroke={hair} strokeWidth="3" strokeLinecap="round" />}
      {style === 7 && <path d="M20 22c1-10 23-10 24 0l-1 3c-7-3-15-3-22 0l-1-3Z" fill={hair} />}
      {beard && <path d="M22 34c2 7 18 7 20 0v3c0 11-20 11-20 0v-3Z" fill={hair} opacity=".85" />}
      <g stroke={hair} strokeWidth="1.8" strokeLinecap="round">
        <path d="M26 29h.1M38 29h.1" strokeWidth="2.5" />
        <path d="m32 30-1.5 5h2" opacity=".35" strokeWidth="1" />
        <path d={hash % 2 ? 'M29 38q3 2 6 0' : 'M29 38h6'} stroke={beard ? skin : hair} strokeWidth="1.2" />
        {glasses && <><rect x="22.5" y="25.5" width="8" height="7" rx="2.3" fill={background} fillOpacity=".12" strokeWidth="1.4" /><rect x="33.5" y="25.5" width="8" height="7" rx="2.3" fill={background} fillOpacity=".12" strokeWidth="1.4" /><path d="M30.5 28h3" strokeWidth="1.4" /></>}
      </g>
    </svg>
  </span>;
}

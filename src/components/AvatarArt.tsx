import type { ReactNode } from 'react';
import { initials } from '../players/playerList.ts';
import type { AvatarId } from '../players/avatars.ts';

const hair = [
  'M20 28V23a12 12 0 0 1 24 0v4l-4-4-5-2-7 3-8 4Z',
  'M20 27V23a12 12 0 0 1 24 0v5l-4-8-16 3-4 4Z',
  'M20 29V23a12 12 0 0 1 24 0v5l-6-7-3 6-8-5-7 7Z',
  'M19 30V22c0-9 10-15 18-11 6 2 9 8 8 16l-4 4-1-9-6-4c-2 6-7 8-12 8l-3 4Z',
  'M19 29V21c0-14 26-14 26 0v9l-5-4-3-10-6 7-9 1-3 5Z',
  'M18 27c-5-4-2-9 2-10-1-5 5-8 9-5 4-5 11-2 11 1 7-1 10 7 6 10l-2 7-5-9-4 4-6-3-6 5h-5Z',
];
const portraits: Partial<Record<AvatarId, { hair?: number; back?: boolean; beard?: boolean; glasses?: boolean; cap?: boolean; bun?: boolean; band?: boolean; headphones?: boolean; moustache?: boolean; palette: number }>> = {
  classic:{hair:0,palette:0},beard:{hair:1,beard:true,palette:1},glasses:{hair:2,glasses:true,palette:2},cap:{cap:true,palette:3},
  long:{hair:3,back:true,palette:2},bob:{hair:4,back:true,palette:0},curls:{hair:5,palette:1},bun:{hair:1,bun:true,palette:3},
  band:{hair:0,band:true,palette:2},smooth:{beard:true,palette:1},headphones:{hair:1,headphones:true,palette:0},moustache:{hair:2,moustache:true,palette:2},
};
const palettes = [['#354953','#d7c5b3','#28303a','#7f99a3'],['#4a4540','#d4bda6','#3a302c','#a08e7e'],['#454858','#d5c8c0','#30313b','#9394aa'],['#3b4e47','#c5b8a3','#2a3632','#7e9989']];

export default function AvatarArt({ avatarId, name = '', robotColor }: { avatarId: AvatarId; name?: string; robotColor?: string }) {
  if (avatarId === 'initials') return <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M0 0h64v64H0Z" fill="#303b46" />
    <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fill="#eef2f6" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="700">{name.trim() ? initials(name) : 'AB'}</text>
  </svg>;
  const p = portraits[avatarId];
  if (p) {
    const [bg,skin,ink,shirt] = palettes[p.palette];
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M0 0h64v64H0Z" fill={bg} />
      {p.back && <path d="M18 26c0-21 28-21 28 0v25H18Z" fill={ink} />}
      {p.bun && <circle cx="32" cy="11" r="8" fill={ink} />}
      <path d="M8 64v-5c0-10 11-15 24-15s24 5 24 15v5Z" fill={shirt} />
      <path d="m24 46 8 9 8-9" stroke={bg} strokeWidth="2" />
      <rect x="27" y="37" width="10" height="13" rx="4" fill={skin} />
      <circle cx="20" cy="31" r="3" fill={skin} /><circle cx="44" cy="31" r="3" fill={skin} />
      <rect x="21" y="14" width="22" height="30" rx="11" fill={skin} />
      {p.hair !== undefined && <path d={hair[p.hair]} fill={ink} />}
      {p.cap && <><path d="M19 23c0-18 26-18 26 0H19Z" fill={shirt} /><path d="M18 23h31c2 0 3 3 0 3H18Z" fill={ink} /></>}
      {p.band && <path d="M20 23q12-5 24 0v5q-12-5-24 0Z" fill={shirt} />}
      {p.beard && <path d="M22 34c2 7 18 7 20 0v3c0 11-20 11-20 0Z" fill={ink} />}
      <g stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 29h.1M38 29h.1" strokeWidth="2.5" /><path d="m32 30-1.5 5h2" strokeWidth="1" opacity=".35" />
        <path d="M29 38q3 2 6 0" stroke={p.beard ? skin : ink} strokeWidth="1.2" />
        {p.glasses && <><rect x="22.5" y="25.5" width="8" height="7" rx="2.3" strokeWidth="1.4" /><rect x="33.5" y="25.5" width="8" height="7" rx="2.3" strokeWidth="1.4" /><path d="M30.5 28h3" strokeWidth="1.4" /></>}
        {p.moustache && <path d="M32 34c-3-3-6-1-8 3 4 1 6-1 8-2 2 1 4 3 8 2-2-4-5-6-8-3Z" fill={ink} stroke="none" />}
        {p.headphones && <><path d="M16 30v-5c0-19 32-19 32 0v5" stroke={shirt} strokeWidth="4" /><rect x="13" y="27" width="7" height="12" rx="3" fill={shirt} stroke="none" /><rect x="44" y="27" width="7" height="12" rx="3" fill={shirt} stroke="none" /></>}
      </g>
    </svg>;
  }
  let bg = '#303b46';
  let art: ReactNode;
  switch (avatarId) {
    case 'alien': bg='#283e3b'; art=<><path d="M13 64c1-13 9-18 19-18s18 5 19 18" fill="#698d81"/><path d="M15 25c0-23 34-23 34 0 0 16-11 26-17 26S15 41 15 25Z" fill="#a6c9a5"/><ellipse cx="24" cy="28" rx="5.5" ry="9" transform="rotate(-28 24 28)" fill="#243f37"/><ellipse cx="40" cy="28" rx="5.5" ry="9" transform="rotate(28 40 28)" fill="#243f37"/><path d="M28 42q4 2 8 0" stroke="#426c51" strokeWidth="1.5" strokeLinecap="round"/></>; break;
    case 'robot': bg=robotColor ? '#26333e' : '#354350'; art=<>
      <path d="M13 64V53c0-8 38-8 38 0v11" fill={robotColor ?? '#8297a4'} opacity={robotColor ? .72 : 1}/>
      <path d="M32 9v8" stroke={robotColor ?? '#b7c8d1'} strokeWidth="3"/>
      <circle cx="32" cy="8" r="3" fill={robotColor ?? '#b7c8d1'}/>
      <rect x="14" y="17" width="36" height="32" rx="9" fill={robotColor ?? '#b1c0c5'}/>
      <rect x="19" y="24" width="26" height="12" rx="5" fill="#3b505b"/>
      <circle cx="25" cy="30" r="2.6" fill={robotColor ? '#eef7fa' : '#bfdbd0'}/>
      <circle cx="39" cy="30" r="2.6" fill={robotColor ? '#eef7fa' : '#bfdbd0'}/>
      <path d="M25 42h14" stroke={robotColor ? '#3b505b' : '#6f858d'} strokeWidth="3" strokeLinecap="round"/>
    </>; break;
    case 'panda': bg='#3a4946'; art=<><path d="M11 64c0-15 10-20 21-20s21 5 21 20" fill="#d9dfd5"/><circle cx="17" cy="17" r="8" fill="#293735"/><circle cx="47" cy="17" r="8" fill="#293735"/><circle cx="32" cy="33" r="21" fill="#e3e5d9"/><ellipse cx="23" cy="31" rx="6" ry="8" transform="rotate(25 23 31)" fill="#33413c"/><ellipse cx="41" cy="31" rx="6" ry="8" transform="rotate(-25 41 31)" fill="#33413c"/><circle cx="24" cy="30" r="2" fill="#e3e5d9"/><circle cx="40" cy="30" r="2" fill="#e3e5d9"/><path d="m29 41 3 3 3-3Z" fill="#33413c"/><path d="M27 47q5 3 10 0" stroke="#718176" strokeWidth="1.5" fill="none"/></>; break;
    case 'cat': bg='#4c4642'; art=<><path d="M12 64c0-15 10-20 20-20s20 5 20 20" fill="#9e8c7d"/><path d="m15 27 2-18 13 12h4L47 9l2 18c10 35-44 35-34 0Z" fill="#c6b29a"/><path d="m20 22 1-8 7 9m16-1-1-8-7 9" fill="#a77e71"/><path d="M22 32h.1M42 32h.1" stroke="#3e3b36" strokeWidth="4" strokeLinecap="round"/><path d="m29 40 3 3 3-3Z" fill="#8e6860"/><path d="M17 38 6 35m11 8L5 44m42-6 11-3m-11 8 12 1M27 47q5 3 10 0" stroke="#807364" strokeWidth="1.3" strokeLinecap="round"/></>; break;
    case 'devil': bg='#493b40'; art=<><path d="M9 64c0-14 10-19 23-19s23 5 23 19" fill="#765061"/><path d="M17 26C7 24 9 8 12 5c1 10 5 11 10 12m25 9c10-2 8-18 5-21-1 10-5 11-10 12" fill="#c0aa8c"/><path d="M15 29c0-24 34-24 34 0v9c0 21-34 21-34 0Z" fill="#bd817d"/><path d="m22 28 7 3m13-3-7 3" stroke="#5a3d48" strokeWidth="2.5" strokeLinecap="round"/><path d="M24 34h.1M40 34h.1" stroke="#40303a" strokeWidth="3" strokeLinecap="round"/><path d="M25 44q7 5 14 0" stroke="#6a404a" strokeWidth="1.6" fill="none"/><path d="m29 51 3 7 3-7" fill="#55404b"/></>; break;
    case 'ghost': bg='#444659'; art=<><path d="M13 58V31c0-29 38-29 38 0v27l-7-5-6 6-6-6-6 6-6-6-7 5Z" fill="#d4d9e5"/><ellipse cx="25" cy="29" rx="3.2" ry="5" fill="#50516a"/><ellipse cx="39" cy="29" rx="3.2" ry="5" fill="#50516a"/><ellipse cx="32" cy="42" rx="4" ry="5.5" fill="#7a7e97"/></>; break;
    case 'astronaut': bg='#344753'; art=<><path d="M10 64V51c0-11 44-11 44 0v13" fill="#c4d0d1"/><path d="M24 55h16" stroke="#768e9c" strokeWidth="4"/><rect x="9" y="24" width="7" height="17" rx="3" fill="#8da6b2"/><rect x="48" y="24" width="7" height="17" rx="3" fill="#8da6b2"/><circle cx="32" cy="29" r="22" fill="#dce4df"/><circle cx="32" cy="29" r="17" fill="#405d6c"/><path d="M20 21q8-9 18-5" stroke="#c5dde1" strokeWidth="3" strokeLinecap="round" fill="none"/><path d="m38 35 5-2" stroke="#7899a6" strokeWidth="2" strokeLinecap="round"/></>; break;
    case 'ninja': bg='#414552'; art=<><path d="M9 64c1-15 10-20 23-20s22 5 23 20" fill="#242c37"/><path d="M15 31c0-29 34-29 34 0v13c0 20-34 20-34 0V31Z" fill="#5e6878"/><path d="M16 29q16-8 32 0v9q-16 7-32 0v-9Z" fill="#d0c0ae"/><path d="M25 32h.1M39 32h.1" stroke="#28313e" strokeWidth="3" strokeLinecap="round"/><path d="M16 40q16-7 32 0v8c-8 12-24 12-32 0v-8Z" fill="#2e3745"/><path d="M14 22h36" stroke="#9aa3b2" strokeWidth="4"/><path d="m47 21 11 6-7 2 7 9-10-5" fill="#9aa3b2"/><path d="m27 52 5 7 5-7" stroke="#747d8f" strokeWidth="2" fill="none"/></>; break;
    case 'fox': bg='#51463e'; art=<><path d="M9 64c1-16 11-20 23-20s22 4 23 20" fill="#b58161"/><path d="m14 29 1-23 16 16h2L49 6l1 23c4 20-10 28-18 28S10 49 14 29Z" fill="#c9956e"/><path d="m19 22 1-9 8 10m17-1-1-9-8 10" fill="#755446"/><path d="M15 31c9 1 14 8 17 15 3-7 8-14 17-15 0 19-13 24-17 24s-17-5-17-24Z" fill="#e3d5bb"/><path d="M22 31h.1M42 31h.1" stroke="#3e342e" strokeWidth="3.7" strokeLinecap="round"/><path d="m27 45 5 5 5-5Z" fill="#4a3a33"/></>; break;
    case 'owl': bg='#454b43'; art=<><path d="m13 17 1-12 13 8h10l13-8 1 12c8 12 6 34-4 44H17C7 51 5 29 13 17Z" fill="#a29c7d"/><path d="M17 41c2 15 28 15 30 0v20H17V41Z" fill="#c9c7a4"/><circle cx="23" cy="28" r="13" fill="#dedbc0"/><circle cx="41" cy="28" r="13" fill="#dedbc0"/><circle cx="23" cy="28" r="7" fill="#6b7660"/><circle cx="41" cy="28" r="7" fill="#6b7660"/><circle cx="24" cy="28" r="3" fill="#333f36"/><circle cx="40" cy="28" r="3" fill="#333f36"/><path d="m27 38 5 8 5-8Z" fill="#9c7c51"/><path d="m23 50 4 4 4-4m3 0 4 4 4-4" stroke="#92977a" strokeWidth="1.8" fill="none"/></>; break;
    case 'viking': bg='#454a53'; art=<><path d="M8 64c1-14 11-20 24-20s23 6 24 20" fill="#7a858d"/><path d="m13 24-8-6V5c4 9 9 9 16 11m30 8 8-6V5c-4 9-9 9-16 11" fill="#cfccb5"/><rect x="18" y="20" width="28" height="31" rx="12" fill="#d7bca0"/><path d="M17 40q15 5 30 0c0 12-8 22-15 24-7-2-15-12-15-24Z" fill="#a98967"/><path d="M29 40q3-4 6 0l5 5-8-2-8 2 5-5Z" fill="#725a45"/><path d="M25 32h.1M39 32h.1" stroke="#3b3a3b" strokeWidth="2.8" strokeLinecap="round"/><path d="M14 27v-5c0-23 36-23 36 0v5H14Z" fill="#9aa6ad"/><path d="M14 25h36M32 8v17" stroke="#d2d8d4" strokeWidth="4"/><circle cx="21" cy="25" r="1.3" fill="#667783"/><circle cx="43" cy="25" r="1.3" fill="#667783"/></>; break;
    default: art=<><circle cx="32" cy="24" r="10" fill="#a4aebb"/><path d="M13 58v-6c0-23 38-23 38 0v6H13Z" fill="#a4aebb"/></>;
  }
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M0 0h64v64H0Z" fill={bg}/>{art}</svg>;
}

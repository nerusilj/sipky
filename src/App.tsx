import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Confetti from './components/Confetti.tsx';
import DartMark from './components/DartMark.tsx';
import EffectOverlay from './components/EffectOverlay.tsx';
import { DartIcon, DevIcon, HomeIcon, PlayersIcon, SettingsIcon } from './components/Icons.tsx';
import { boardConnection, useConnection } from './connection.ts';
import { DART_THEMES } from './dartThemes.ts';
import { useAccent, useDartTheme, useShowDev, useVenueName } from './settings.ts';
import DevPage from './pages/DevPage.tsx';
import GamePage from './pages/GamePage.tsx';
import HomePage from './pages/HomePage.tsx';
import PlayersPage from './pages/PlayersPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';

type Section = 'home' | 'game' | 'players' | 'settings' | 'dev';
const NAV: { id: Section; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'home', label: 'Domů', Icon: HomeIcon },
  { id: 'game', label: 'Hra', Icon: DartIcon },
  { id: 'players', label: 'Hráči', Icon: PlayersIcon },
  { id: 'dev', label: 'DEV', Icon: DevIcon },
];

export default function App() {
  const [section, setSection] = useState<Section>('home');
  const [startScore, setStartScore] = useState<301 | 501>(501);
  const connection = useConnection();
  const venueName = useVenueName();
  const dartTheme = useDartTheme();
  const showDev = useShowDev();
  const online = connection.state === 'connected';
  const nav = NAV.filter(item => item.id !== 'dev' || showDev);
  // Po skrytí sekce DEV se z ní odejde na Domů.
  const current: Section = section === 'dev' && !showDev ? 'home' : section;

  // Desktopová aplikace se k terči připojí sama; spojení je pouze pro čtení.
  useEffect(() => boardConnection.start(), []);
  // Barva aplikace: odstíny zvolené barvy do CSS proměnných (odvozené tóny dopočítá CSS).
  const accent = useAccent();
  useEffect(() => {
    const theme = DART_THEMES[accent], root = document.documentElement.style;
    root.setProperty('--accent', theme.mid);
    root.setProperty('--accent-light', theme.light);
    root.setProperty('--accent-dark', theme.dark);
  }, [accent]);

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span>{venueName}</span><DartMark theme={dartTheme} /></div>
      <div className="topbar-status">
        <span className={`dot ${online ? '' : 'amber-dot'}`}></span>
        <strong className={online ? 'online' : ''}>{online ? 'Autodarts připojeno' : 'Autodarts nepřipojeno'}</strong>
      </div>
      <button className={`icon-button ${current === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')} aria-label="Nastavení" title="Nastavení"
        aria-current={current === 'settings' ? 'page' : undefined}><SettingsIcon size={20} /></button>
    </header>
    <nav className="sidebar" aria-label="Hlavní navigace">
      {nav.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${current === id ? 'active' : ''} ${id === 'dev' ? 'nav-dev' : ''}`}
        aria-current={current === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon /><span>{label}</span></button>)}
    </nav>
    <main className="content">
      {current === 'home' && <HomePage onPlayers={() => setSection('players')} onPlay={score => { setStartScore(score); setSection('game'); }} />}
      {current === 'game' && <GamePage startScore={startScore} onPlayers={() => setSection('players')} />}
      {current === 'players' && <PlayersPage />}
      {current === 'settings' && <SettingsPage />}
      {current === 'dev' && <DevPage onSettings={() => setSection('settings')} />}
    </main>
    <Confetti />
    <EffectOverlay />
  </div>;
}

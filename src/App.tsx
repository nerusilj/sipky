import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Confetti from './components/Confetti.tsx';
import DartMark from './components/DartMark.tsx';
import EffectOverlay from './components/EffectOverlay.tsx';
import { DartIcon, DevIcon, HomeIcon, PlayersIcon, SettingsIcon } from './components/Icons.tsx';
import { boardConnection, useConnection } from './connection.ts';
import { useDartTheme, useVenueName } from './settings.ts';
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
  const online = connection.state === 'connected';

  // Desktopová aplikace se k terči připojí sama; spojení je pouze pro čtení.
  useEffect(() => boardConnection.start(), []);

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span>{venueName}</span><DartMark theme={dartTheme} /></div>
      <div className="topbar-status">
        <span className={`dot ${online ? '' : 'amber-dot'}`}></span>
        <strong className={online ? 'online' : ''}>{online ? 'Autodarts připojeno' : 'Autodarts nepřipojeno'}</strong>
      </div>
      <button className={`icon-button ${section === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')} aria-label="Nastavení" title="Nastavení"
        aria-current={section === 'settings' ? 'page' : undefined}><SettingsIcon size={20} /></button>
    </header>
    <nav className="sidebar" aria-label="Hlavní navigace">
      {NAV.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${section === id ? 'active' : ''} ${id === 'dev' ? 'nav-dev' : ''}`}
        aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon /><span>{label}</span></button>)}
    </nav>
    <main className="content">
      {section === 'home' && <HomePage onPlayers={() => setSection('players')} onPlay={score => { setStartScore(score); setSection('game'); }} />}
      {section === 'game' && <GamePage startScore={startScore} onPlayers={() => setSection('players')} />}
      {section === 'players' && <PlayersPage />}
      {section === 'settings' && <SettingsPage />}
      {section === 'dev' && <DevPage onSettings={() => setSection('settings')} />}
    </main>
    <Confetti />
    <EffectOverlay />
  </div>;
}

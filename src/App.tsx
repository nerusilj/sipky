import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { BoardLogo, DartIcon, DevIcon, HomeIcon, PlayersIcon, SettingsIcon } from './components/Icons.tsx';
import { boardConnection, useConnection } from './connection.ts';
import ComingSoonPage from './pages/ComingSoonPage.tsx';
import DevPage from './pages/DevPage.tsx';
import HomePage from './pages/HomePage.tsx';
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
  const connection = useConnection();
  const online = connection.state === 'connected';

  // Desktopová aplikace se k terči připojí sama; spojení je pouze pro čtení.
  useEffect(() => { try { boardConnection.connect(); } catch { /* Neplatnou adresu opraví uživatel v Nastavení. */ } }, []);

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><BoardLogo /><span>HOLICE-Šipky</span></div>
      <div className="topbar-status">
        <span className={`dot ${online ? '' : 'amber-dot'}`}></span>
        <div><strong className={online ? 'online' : ''}>{online ? 'Autodarts připojeno' : 'Autodarts nepřipojeno'}</strong><span>Board: {connection.address}</span></div>
      </div>
      <button className={`icon-button ${section === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')} aria-label="Nastavení" title="Nastavení"
        aria-current={section === 'settings' ? 'page' : undefined}><SettingsIcon size={20} /></button>
    </header>
    <nav className="sidebar" aria-label="Hlavní navigace">
      {NAV.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${section === id ? 'active' : ''} ${id === 'dev' ? 'nav-dev' : ''}`}
        aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon /><span>{label}</span></button>)}
    </nav>
    <main className="content">
      {section === 'home' && <HomePage />}
      {section === 'game' && <ComingSoonPage title="Hra" text="301, 501 a Cricket s automatickým počítáním z terče." />}
      {section === 'players' && <ComingSoonPage title="Hráči" text="Profily hráčů a jejich historie." />}
      {section === 'settings' && <SettingsPage />}
      {section === 'dev' && <DevPage onSettings={() => setSection('settings')} />}
    </main>
  </div>;
}

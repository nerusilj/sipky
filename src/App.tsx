import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import ConfirmLeaveDialog from './components/ConfirmLeaveDialog.tsx';
import { WindowCloseGuard } from './windowClose.ts';
import type { ComponentType } from 'react';
import Confetti from './components/Confetti.tsx';
import EffectOverlay from './components/EffectOverlay.tsx';
import { BoardConnectionIcon, DartIcon, DevIcon, HomeIcon, PlayersIcon, SettingsIcon } from './components/Icons.tsx';
import { boardConnection, useConnection } from './connection.ts';
import { useShowDev, useVenueName } from './settings.ts';
import DevPage from './pages/DevPage.tsx';
import GamePage from './pages/GamePage.tsx';
import CricketPage from './pages/CricketPage.tsx';
import { useCricket } from './game/cricketStore.ts';
import { endAnyGame, isAnyGameRunning } from './game/activeGame.ts';
import type { GameMode } from './game/activeGame.ts';
import HomePage from './pages/HomePage.tsx';
import PlayersPage from './pages/PlayersPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import { useGame } from './game/gameStore.ts';

type Section = 'home' | 'game' | 'players' | 'settings' | 'dev';
const NAV: { id: Section; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'home', label: 'Domů', Icon: HomeIcon },
  { id: 'game', label: 'Hra', Icon: DartIcon },
  { id: 'players', label: 'Hráči', Icon: PlayersIcon },
  { id: 'dev', label: 'DEV', Icon: DevIcon },
];

export default function App() {
  const [section, setSection] = useState<Section>('home');
  const [mode, setMode] = useState<GameMode>('x01');
  const [pendingMode, setPendingMode] = useState<GameMode>('x01');
  const [leave, setLeave] = useState<'close' | 'newGame'>();
  const [closeError, setCloseError] = useState<string>();
  const closeGuard = useRef<WindowCloseGuard | undefined>(undefined);
  const connection = useConnection();
  const venueName = useVenueName();
  const showDev = useShowDev();
  const online = connection.state === 'connected';
  const nav = NAV.filter(item => item.id !== 'dev' || showDev);
  // Po skrytí sekce DEV se z ní odejde na Domů.
  const current: Section = section === 'dev' && !showDev ? 'home' : section;
  const { game } = useGame();
  const { game: cricket } = useCricket();
  const hasGame = !!game || !!cricket;
  const gameScreen = current === 'game' && hasGame;

  // Desktopová aplikace se k terči připojí sama; spojení je pouze pro čtení.
  useEffect(() => boardConnection.start(), []);

  useEffect(() => {
    if (!isTauri()) {
      const warn = (event: BeforeUnloadEvent) => {
        if (isAnyGameRunning()) { event.preventDefault(); event.returnValue = ''; }
      };
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
    }
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();
    const guard = new WindowCloseGuard(isAnyGameRunning, open => {
      setCloseError(undefined); setLeave(open ? 'close' : undefined);
    }, () => appWindow.destroy(), setCloseError);
    closeGuard.current = guard;
    void appWindow.onCloseRequested(event => { if (disposed) event.preventDefault(); else guard.request(event); })
      .then(stop => { if (disposed) stop(); else unlisten = stop; })
      .catch(() => { if (!disposed) setCloseError('Ochranu při zavírání aplikace se nepodařilo zapnout.'); });
    return () => { disposed = true; unlisten?.(); };
  }, []);

  const newGame = (nextMode: GameMode) => {
    setPendingMode(nextMode);
    setCloseError(undefined);
    if (isAnyGameRunning()) { setLeave('newGame'); return; }
    endAnyGame(); setMode(nextMode); setSection('game');
  };

  return <div className={`shell ${gameScreen ? 'game-screen' : ''}`}>
    {!gameScreen && <><header className="topbar">
      <div className="brand"><span className="brand-emblem" aria-hidden="true"><BoardConnectionIcon size={30} /></span><div className="brand-copy"><span className="brand-product">ŠIPKY</span><strong>{venueName}</strong></div></div>
      <div className="topbar-status">
        <span className={`dot ${online ? '' : 'amber-dot'}`}></span>
        <strong className={online ? 'online' : ''}>{online ? 'Autodarts připojeno' : 'Autodarts nepřipojeno'}</strong>
      </div>
      <button className={`icon-button topbar-settings ${current === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')} aria-label="Nastavení" title="Nastavení"
        aria-current={current === 'settings' ? 'page' : undefined}><SettingsIcon size={20} /><span>Nastavení</span></button>
    </header>
    <nav className="sidebar" aria-label="Hlavní navigace">
      {nav.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${current === id ? 'active' : ''} ${id === 'dev' ? 'nav-dev' : ''}`}
        aria-current={current === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon /><span>{label}</span></button>)}
    </nav></>}
    <main className="content">
      {current === 'home' && <HomePage onPlay={newGame} />}
      {current === 'game' && (mode === 'cricket' ? <CricketPage onSettings={() => setSection('settings')} /> : <GamePage onSettings={() => setSection('settings')} />)}
      {current === 'players' && <PlayersPage />}
      {current === 'settings' && <SettingsPage onGame={hasGame ? () => setSection('game') : undefined} />}
      {current === 'dev' && <DevPage onSettings={() => setSection('settings')} />}
    </main>
    <Confetti />
    <EffectOverlay />
    {leave && <ConfirmLeaveDialog key={leave} action={leave} error={closeError}
      onCancel={() => { closeGuard.current?.cancel(); setLeave(undefined); setSection('game'); }}
      onConfirm={async () => {
        if (leave === 'close') await closeGuard.current?.confirm();
        else { endAnyGame(); setMode(pendingMode); setSection('game'); setLeave(undefined); }
      }} />}
    {closeError && !leave && <p role="alert">{closeError}</p>}
  </div>;
}

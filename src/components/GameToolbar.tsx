import SegmentedControl from './SegmentedControl.tsx';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { DartIcon, FocusPlayerIcon, RowsIcon, SettingsIcon, SoundIcon, StatsIcon, TilesIcon } from './Icons.tsx';
import Toggle from './Toggle.tsx';
import { setBoardVisible, setCallerEnabled, setEffectsEnabled, setGameView, setSoundEnabled, useBoardVisible, useCallerEnabled, useEffectsEnabled, useGameView, useSoundEnabled } from '../settings.ts';

function ToolMenu({ label, icon, children, className = '' }: { label: string; icon: ReactNode; children: ReactNode; className?: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false; menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  return <details ref={menu} className={`tool-menu ${className}`} onToggle={() => {
    if (menu.current?.open) document.querySelectorAll<HTMLDetailsElement>('.tool-menu[open]').forEach(other => { if (other !== menu.current) other.open = false; });
  }}>
    <summary className="icon-button" aria-label={label} title={label}>{icon}</summary>
    <div className="tool-popover" role="group" aria-label={label}>{children}</div>
  </details>;
}

export default function GameToolbar({ onStatistics, onSettings, statisticsOpen, layoutOptions = true, onBullOff, bullOffActive = false }: {
  layoutOptions?: boolean; onStatistics: () => void; onSettings: () => void; statisticsOpen: boolean;
  onBullOff?: () => void; bullOffActive?: boolean;
}) {
  const view = useGameView(), board = useBoardVisible(), sound = useSoundEnabled();
  const caller = useCallerEnabled(), effects = useEffectsEnabled();
  return <div className="game-tools" role="toolbar" aria-label="Nastavení a přehled hry">
    {onBullOff && <button className="icon-button" aria-label="Rozhoz na střed" title={bullOffActive ? 'Rozhoz na střed právě probíhá' : 'Rozhodnout leg rozhozem na střed'}
      aria-haspopup="dialog" aria-controls="finish-leg-dialog" disabled={bullOffActive} onClick={onBullOff}><DartIcon size={24} /></button>}
    <button className="icon-button" aria-label="Statistiky" title="Statistiky a průběh hry" aria-expanded={statisticsOpen} aria-controls="game-statistics" onClick={onStatistics}><StatsIcon size={24} /></button>
    <button className="icon-button game-toggle" aria-label="Zvuk" aria-pressed={sound} title={sound ? 'Vypnout zvuk' : 'Zapnout zvuk'} onClick={() => setSoundEnabled(!sound)}><SoundIcon size={24} muted={!sound} /></button>
    <ToolMenu label="Zobrazení a volby hry" icon={<SettingsIcon size={24} />}>
      {layoutOptions && <><span className="tool-menu-label">Zobrazení hráčů</span>
      <SegmentedControl vertical className="view-choice" label="Zobrazení hráčů" value={view} onChange={setGameView}
        options={([{ value: 'tiles', label: 'Dlaždice', Icon: TilesIcon }, { value: 'rows', label: 'Řádky', Icon: RowsIcon }, { value: 'focus', label: 'Aktivní hráč', Icon: FocusPlayerIcon }] as const)
          .map(({ value, label, Icon }) => ({ value, label: <><Icon size={20} /><span>{label}</span></> }))} />
      <div className="tool-divider" /></>}
      <Toggle checked={board} onChange={setBoardVisible}>Zobrazit terč</Toggle>
      <div className="tool-divider" />
      <span className="tool-menu-label">Hlas a efekty</span>
      <Toggle checked={sound && caller} disabled={!sound} onChange={setCallerEnabled}>Hlasatel</Toggle>
      <Toggle checked={effects} onChange={setEffectsEnabled}>Zábavné efekty</Toggle>
      <div className="tool-divider" />
      <button className="tool-menu-action" onClick={onSettings}><SettingsIcon size={18} />Nastavení aplikace</button>
    </ToolMenu>
  </div>;
}

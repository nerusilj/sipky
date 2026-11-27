import type { GameMode } from '../game/activeGame.ts';
import { useShowDev } from '../settings.ts';
import { CheckIcon, ChevronIcon, TileBoard } from './Icons.tsx';

const MODES = [
  { id: 'x01', title: 'X01', subtitle: 'Odpočítávání do nuly' },
  { id: 'cricket', title: 'Cricket', subtitle: 'Zavírání čísel a bodování' },
  { id: 'shooter', title: 'Shooter', subtitle: 'Zasáhni vylosované číslo' },
] as const;

export default function GameModeCards({ onSelect, selected, compact = false, disabled = false }: {
  onSelect: (mode: GameMode) => void;
  selected?: GameMode;
  compact?: boolean;
  disabled?: boolean;
}) {
  const showDev = useShowDev();
  return <div className={`modes${compact ? ' mode-picker--compact' : ''}`} role="group" aria-label={compact ? 'Přepnout hru' : 'Vybrat hru'}>
    {MODES.map(mode => {
      const available = mode.id !== 'shooter' || showDev;
      const active = selected === mode.id;
      return <button key={mode.id} type="button" className={`mode-tile ${mode.id}${!available ? ' mode-unavailable' : ''}`}
        disabled={disabled || !available} aria-pressed={compact ? active : undefined}
        title={available ? `${compact ? 'Příprava hry' : 'Nová hra'} ${mode.title}` : 'Připravujeme'}
        onClick={() => { if (available && !disabled && !active) onSelect(mode.id); }}>
        <TileBoard /><strong>{mode.title}</strong>{!compact && <span>{mode.subtitle}</span>}
        {!available && <span className="mode-soon">PŘIPRAVUJEME</span>}
        {compact ? active && available && <span className="mode-selected" aria-hidden="true"><CheckIcon size={16} /></span>
          : <span className="mode-chevron"><ChevronIcon size={18} /></span>}
      </button>;
    })}
  </div>;
}

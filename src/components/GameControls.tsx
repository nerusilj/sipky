import { isTauri } from '@tauri-apps/api/core';
import { boardStatusDisplay } from '../autodarts/boardStatus.ts';
import { boardConnection, useConnection } from '../connection.ts';
import { useAutodartsEnabled } from '../settings.ts';
import { STATE_LABELS } from './ConnectionPanel.tsx';
import { ChevronIcon, CloseIcon, EjectIcon, KeyboardIcon, UndoIcon } from './Icons.tsx';

export default function GameControls({ onUndo, canUndo, onKeyboard, keyboardOpen = false,
  onNext, nextDisabled = false, nextLabel = 'Další hráč', confirmSkip = false, onMiss, missDisabled = false, onCancelBullOff }: {
  onUndo: () => void; canUndo: boolean;
  onKeyboard?: () => void; keyboardOpen?: boolean; onNext?: () => void; nextDisabled?: boolean; nextLabel?: string; confirmSkip?: boolean;
  onMiss?: () => void; missDisabled?: boolean; onCancelBullOff?: () => void;
}) {
  const connection = useConnection();
  const autodartsEnabled = useAutodartsEnabled();
  const online = connection.state === 'connected';
  const boardStatus = online && connection.boardStatus ? boardStatusDisplay(connection.boardStatus)
    : { label: online ? 'Stav detekce neznámý' : STATE_LABELS[connection.state], tone: online || connection.state === 'disconnected' ? 'neutral' : 'yellow' };
  const statusLabel = connection.commandPending === 'reset' ? 'Resetuji terč…' : boardStatus.label;

  return <div className="game-controls" role="toolbar" aria-label="Ovládání hry">
    {autodartsEnabled && <div className="game-board-status" data-tone={boardStatus.tone}>
      <span className="game-board-label" role="status" title={statusLabel}>
        <span className="game-board-name">Autodarts</span>
        <strong>{statusLabel}</strong>
      </span>
      <button type="button" className="game-board-reset" aria-label="Resetovat terč Autodarts" title="Resetovat terč Autodarts"
        disabled={!online || !!connection.commandPending || !isTauri()} onClick={() => void boardConnection.controlBoard('reset')}>
        <EjectIcon size={16} />
      </button>
      <span className="game-board-error" role="status">{connection.commandResult?.action === 'reset' && connection.commandResult.error}</span>
    </div>}
    <button aria-label="Zpět" title="Vrátit poslední krok" disabled={!canUndo} onClick={onUndo}><UndoIcon size={25} /></button>
    {onMiss && <button className="miss-control" aria-label="Zapsat mimo" title="Zapsat netrefu, kterou terč nezachytil" disabled={missDisabled}
      onClick={onMiss}>MIMO</button>}
    {onKeyboard && <button aria-label="Klávesnice" title={keyboardOpen ? 'Skrýt klávesnici' : 'Zobrazit klávesnici'}
      aria-controls="game-keypad" aria-expanded={keyboardOpen} aria-pressed={keyboardOpen} onClick={onKeyboard}><KeyboardIcon size={25} /></button>}
    {onNext && <button className="next-control" aria-label={nextLabel} title={nextLabel} disabled={nextDisabled} aria-expanded={confirmSkip}
      onClick={onNext}><ChevronIcon size={28} /></button>}
    {onCancelBullOff && <button aria-label="Zrušit rozhoz" title="Zrušit rozhoz a pokračovat v legu" onClick={onCancelBullOff}><CloseIcon size={25} /></button>}
  </div>;
}

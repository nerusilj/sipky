import { ChevronIcon, CloseIcon, KeyboardIcon, UndoIcon } from './Icons.tsx';

export default function GameControls({ onUndo, canUndo, onKeyboard, keyboardOpen = false,
  onNext, nextDisabled = false, nextLabel = 'Další hráč', confirmSkip = false, onMiss, missDisabled = false, onCancelBullOff }: {
  onUndo: () => void; canUndo: boolean;
  onKeyboard?: () => void; keyboardOpen?: boolean; onNext?: () => void; nextDisabled?: boolean; nextLabel?: string; confirmSkip?: boolean;
  onMiss?: () => void; missDisabled?: boolean; onCancelBullOff?: () => void;
}) {
  return <div className="game-controls" role="toolbar" aria-label="Ovládání hry">
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

import { useEffect, useRef, useState } from 'react';
import { CloseIcon, ExitIcon } from './Icons.tsx';

export default function ConfirmLeaveDialog({ action, error, onCancel, onConfirm }: {
  action: 'close' | 'newGame' | 'endGame'; error?: string; onCancel: () => void; onConfirm: () => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal(); cancel.current?.focus();
    return () => element?.close();
  }, []);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="end-game-dialog" aria-labelledby="leave-title" aria-describedby="leave-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="end-dialog-body">
      <div className="end-dialog-top"><span className="end-dialog-symbol" aria-hidden="true"><ExitIcon size={25} /></span>
        <button className="icon-button" aria-label="Zavřít dialog" disabled={busy} onClick={onCancel}><CloseIcon size={22} /></button></div>
      <h2 id="leave-title">{action === 'close' ? 'Ukončit aplikaci?' : action === 'endGame' ? 'Ukončit rozehranou hru?' : 'Začít novou hru?'}</h2>
      <p id="leave-description">Rozehraná hra bude zrušena.</p>
      {error && <p role="alert">{error}</p>}
    </div>
    <div className="end-dialog-actions">
      <button className="primary" ref={cancel} disabled={busy} onClick={onCancel}>Pokračovat ve hře</button>
      <button className="end-confirm" disabled={busy} onClick={() => { void confirm(); }}><ExitIcon size={18} />
        {action === 'close' ? 'Ukončit aplikaci' : action === 'endGame' ? 'Ukončit hru' : 'Zrušit hru a začít novou'}</button>
    </div>
  </dialog>;
}

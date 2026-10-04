import type { ReactNode } from 'react';

// Jednotný přepínač v celé aplikaci: posuvný vypínač v barvě aplikace a pevný popisek (stav ukazuje jen vypínač).
export default function Toggle({ checked, onChange, children, disabled }: {
  checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; disabled?: boolean;
}) {
  return <label className={`toggle ${disabled ? 'disabled' : ''}`}>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
    <span className="toggle-track" aria-hidden="true"><span className="toggle-knob" /></span>
    <span className="toggle-label">{children}</span>
  </label>;
}

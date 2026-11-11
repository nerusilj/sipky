import type { KeyboardEvent, ReactNode } from 'react';

type Choice = string | number | boolean;
type Option<T> = { value: T; label: ReactNode; title?: string; disabled?: boolean };

/** Stejně široké volby se společným ovládáním myší, dotykem i klávesnicí. */
export default function SegmentedControl<T extends Choice>({ value, onChange, options, label, disabled = false, className = '', variant = 'filled', vertical = false }: {
  value: T; onChange: (value: T) => void; options: readonly Option<T>[]; label: string;
  disabled?: boolean; className?: string; variant?: 'filled' | 'underline'; vertical?: boolean;
}) {
  const active = options.findIndex(option => option.value === value && !option.disabled);
  const entry = active < 0 ? options.findIndex(option => !option.disabled) : active;
  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (!buttons.length) return;
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (buttons.indexOf(event.currentTarget) + step + buttons.length) % buttons.length;
    buttons[index].focus(); buttons[index].click();
  }
  return <div className={`segmented segmented--${variant}${vertical ? ' segmented--vertical' : ''} ${className}`} role="radiogroup" aria-label={label} aria-orientation={vertical ? 'vertical' : 'horizontal'} aria-disabled={disabled || undefined}>
    {options.map((option, index) => <button type="button" key={String(option.value)} role="radio" aria-checked={option.value === value}
      tabIndex={index === entry ? 0 : -1} disabled={disabled || option.disabled} title={option.title}
      onKeyDown={navigate} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

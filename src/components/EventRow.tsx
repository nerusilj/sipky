import { memo } from 'react';
import type { StoredMessage } from '../inspector/types.ts';

export default memo(function EventRow({ message, selected, onSelect }: { message: StoredMessage; selected: boolean; onSelect: (id: number) => void }) {
  return <button className={`event-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(message.id)} aria-pressed={selected}>
    <span className="event-meta"><time>{new Date(message.timestamp).toLocaleTimeString('cs-CZ', { hour12: false, fractionalSecondDigits: 3 })}</time>
      <span className={`direction ${message.direction}`}>{message.direction === 'in' ? '↓ PŘÍCHOZÍ' : '↑ ODCHOZÍ'}</span><span className="event-id">#{message.id}</span></span>
    <strong>{message.channel || 'Bez typu'}</strong>
    {message.topic && <span className="topic">{message.topic}</span>}
    <code className="preview">{message.preview}</code>
    {message.format === 'text' && <span className="badge amber">NEPLATNÝ JSON / TEXT</span>}
  </button>;
});

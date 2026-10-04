import { useState } from 'react';
import type { StoredMessage } from '../inspector/types.ts';

export default function EventDetails({ message }: { message?: StoredMessage }) {
  const [raw, setRaw] = useState(false);
  return <section className="details-pane" aria-label="Detail zprávy">
    <div className="pane-heading"><h3>Detail zprávy</h3>{message && <button className="text-button" onClick={() => setRaw(!raw)}>{raw ? 'Formátovaný JSON' : 'Původní text'}</button>}</div>
    {message ? <><div className="detail-meta"><span className="badge">#{message.id}</span><time>{message.timestamp}</time></div>
      <pre tabIndex={0}>{raw ? message.raw : JSON.stringify(message.payload, null, 2)}</pre></> :
      <div className="empty-state detail-empty"><span className="braces" aria-hidden="true">{'{ }'}</span><h3>Každý detail zachovaný</h3><p>Vyberte zprávu vlevo. Zobrazí se celá obálka včetně původního textu.</p></div>}
  </section>;
}

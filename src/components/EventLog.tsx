import EventRow from './EventRow.tsx';
import type { StoredMessage } from '../inspector/types.ts';

export const PAGE_SIZE = 100;
export default function EventLog({ messages, hasCaptured, page, selectedId, onPage, onSelect }: {
  messages: readonly StoredMessage[]; hasCaptured: boolean; page: number; selectedId?: number;
  onPage: (page: number) => void; onSelect: (id: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(messages.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = messages.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  return <section className="log-pane" aria-label="Seznam zpráv">
    <div className="pane-heading"><h3>Zprávy <span className="count">{messages.length}</span></h3><span className="small muted">Nejnovější nahoře</span></div>
    <div className="event-list">
      {visible.length ? visible.map(message => <EventRow key={message.id} message={message} selected={selectedId === message.id} onSelect={onSelect} />) :
        <div className="empty-state"><div className="empty-symbol" aria-hidden="true">⌁</div><h3>{hasCaptured ? 'Žádná shoda' : 'Zatím žádné zprávy'}</h3>
          <p>{hasCaptured ? 'Upravte filtr kanálu, směru nebo hledaný text.' : 'Zde se zobrazí nezměněné zprávy z vlastního připojení Autodarts. Živý záznam čeká na ověření přihlášení.'}</p>{!hasCaptured && <span className="badge">ŽÁDNÁ SIMULOVANÁ DATA</span>}</div>}
    </div>
    <div className="pagination"><button disabled={safePage === 0} onClick={() => onPage(safePage - 1)}>← Novější</button><span>{safePage + 1} / {pages}</span><button disabled={safePage + 1 >= pages} onClick={() => onPage(safePage + 1)}>Starší →</button></div>
  </section>;
}

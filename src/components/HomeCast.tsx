import { useId, useState } from 'react';
import { connectTelevision, disconnectTelevision, findTelevisions, useLocalCast } from '../cast/localCast.ts';
import { ChevronIcon } from './Icons.tsx';
import HomeStatus from './HomeStatus.tsx';

export default function HomeCast({ disabled }: { disabled: boolean }) {
  const { remembered, connected, devices, busy, error } = useLocalCast();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const television = connected ?? remembered;
  const message = busy === 'searching' ? 'Hledám televize v místní síti…'
    : busy === 'connecting' ? 'Připojuji televizi…'
    : busy === 'disconnecting' ? 'Odpojuji televizi…'
    : error ? 'Chyba spojení' : connected ? 'Připojeno' : 'Nepřipojeno';
  const unavailable = disabled || !!busy;
  function search() {
    setDetailsOpen(true);
    void findTelevisions();
  }

  return <section className="home-connection card home-cast" aria-labelledby="home-cast-title">
    <div className="home-board-row">
      <div className="home-board-info">
        <strong id="home-cast-title">Televize</strong>
        <HomeStatus tone={busy ? 'pending' : error ? 'error' : connected ? 'positive' : 'neutral'}>{message}</HomeStatus>
      </div>
      <div className="home-board-actions">
        {television ? <button type="button" className="home-cast-target" disabled={unavailable}
          onClick={() => { if (connected) void disconnectTelevision(); else void findTelevisions(true); }}>
          <span className="home-cast-verb">{connected ? 'Odpojit' : 'Připojit'}</span><span>{television.name}</span>
        </button> : <button type="button" disabled={unavailable} onClick={search}>Připojit k TV</button>}
        <button type="button" className="connection-expand text-button" aria-expanded={detailsOpen} aria-controls={detailsId}
          onClick={() => setDetailsOpen(open => !open)}>Podrobnosti <ChevronIcon size={18} /></button>
      </div>
    </div>
    {error && <p role="alert" className="field-error home-cast-error">{error}</p>}
    <div id={detailsId} hidden={!detailsOpen} className="home-panel-details">
      <div className="home-board-row home-detail-row">
        <div className="home-board-info">
          {connected ? <p>Po spuštění hry se skóre automaticky zobrazí na televizi.</p> : <>
            {!!devices?.length && <div className="home-cast-devices">
              <p id={`${detailsId}-devices`}>Nalezené televize</p>
              <ul aria-labelledby={`${detailsId}-devices`}>
                {devices.map(device => <li key={device.id}>
                  <button type="button" disabled={unavailable} onClick={() => void connectTelevision(device)}
                    aria-label={`Připojit ${device.name}`}>{device.name}</button>
                </li>)}
              </ul>
            </div>}
            {devices?.length === 0 && <p role="status">Žádná televize nebyla nalezena. Zkontrolujte, že jsou notebook a Chromecast ve stejné síti.</p>}
          </>}
        </div>
        {!connected && <div className="home-board-actions">
          <button type="button" className="text-button" disabled={unavailable} onClick={search}>
            Vyhledat TV
          </button>
        </div>}
      </div>
    </div>
  </section>;
}

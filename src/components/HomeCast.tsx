import { connectTelevision, disconnectTelevision, findTelevisions, hideTelevisions, useLocalCast } from '../cast/localCast.ts';

export default function HomeCast({ disabled }: { disabled: boolean }) {
  const { remembered, connected, devices, busy, error } = useLocalCast();
  const message = busy === 'searching' ? 'Hledám televize v místní síti…'
    : busy === 'connecting' ? 'Připojuji televizi…'
    : busy === 'disconnecting' ? 'Odpojuji televizi…'
    : connected ? `Připojeno k TV – ${connected.name}` : undefined;
  const unavailable = disabled || !!busy;

  return <section className="home-connection card home-cast" aria-labelledby="home-cast-title">
    <div className="home-board-row">
      <div className="home-board-info">
        <strong id="home-cast-title">Televize</strong>
        {message && <span role="status" className={connected ? 'online' : 'muted'}>{message}</span>}
      </div>
      <div className="home-board-actions">
        {connected
          ? <button type="button" disabled={unavailable} onClick={() => void disconnectTelevision()}>Odpojit TV</button>
          : <>
            <button type="button" disabled={unavailable} onClick={() => void findTelevisions(true)}>
              {remembered ? `Připojit k TV – ${remembered.name}` : 'Připojit k TV'}
            </button>
            {remembered && !devices && <button type="button" className="text-button" disabled={unavailable}
              onClick={() => void findTelevisions()}>Vybrat jinou TV</button>}
          </>}
      </div>
    </div>
    {devices && <div className="home-cast-devices">
      {!!devices.length && <ul aria-label="Dostupné televize">
        {devices.map(television => <li key={television.id}>
          <button type="button" disabled={unavailable} onClick={() => void connectTelevision(television)}>{television.name}</button>
        </li>)}
      </ul>}
      {!devices.length && <p role="status">Žádná televize nebyla nalezena. Zkontrolujte, že jsou notebook a Chromecast ve stejné síti.</p>}
      <button type="button" className="text-button" disabled={unavailable} onClick={hideTelevisions}>Zavřít seznam</button>
    </div>}
    {error && <p role="alert" className="field-error home-cast-error">{error}</p>}
  </section>;
}

import { useId, useState } from 'react';
import type { useAppUpdate } from '../appUpdate.ts';
import { ChevronIcon } from './Icons.tsx';
import HomeStatus from './HomeStatus.tsx';

const checkTime = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });

export default function AppUpdatePanel({ update, gameRunning }: {
  update: ReturnType<typeof useAppUpdate>;
  gameRunning: boolean;
}) {
  const { desktop, version, status, checking, installing, installedUpdate, lastCheckedAt, error, check, install } = update;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const message = installedUpdate ? `Verze ${installedUpdate} je nainstalovaná. Restartujte Šipky.`
    : installing ? 'Stahuji a instaluji aktualizaci. Potvrďte instalaci v systémovém dialogu.'
    : checking ? 'Kontroluji aktualizace…'
    : error ? 'Chyba aktualizace'
    : status?.updateAvailable ? `K dispozici je verze ${status.latest}`
    : status ? 'Aplikace je aktuální'
    : desktop ? 'Stav aktualizací neověřen' : 'Webový náhled';

  return <section className="home-update card" aria-label="Verze aplikace a aktualizace">
    <div className="home-board-row">
      <div className="home-board-info">
        <strong>Verze aplikace {version}</strong>
        <HomeStatus tone={installedUpdate ? 'notice' : installing || checking ? 'pending' : error ? 'error'
          : status?.updateAvailable ? 'notice' : status ? 'positive' : 'neutral'}>{message}</HomeStatus>
      </div>
      {desktop && <div className="home-board-actions">
        <button type="button" className="connection-expand text-button" aria-expanded={detailsOpen} aria-controls={detailsId}
          onClick={() => setDetailsOpen(open => !open)}>Podrobnosti <ChevronIcon size={18} /></button>
      </div>}
    </div>
    {desktop && <div id={detailsId} hidden={!detailsOpen} className="home-panel-details">
      <div className="home-board-row home-detail-row">
        <div className="home-board-info">
          {lastCheckedAt !== undefined && <p>Poslední úspěšná kontrola <time dateTime={new Date(lastCheckedAt).toISOString()}>{checkTime.format(lastCheckedAt)}</time></p>}
        </div>
        {!installedUpdate && <div className="home-board-actions">
          {status?.canInstall && <button type="button" className="primary" disabled={installing || gameRunning} onClick={() => void install()}>
            Aktualizovat
          </button>}
          {status?.updateAvailable && !status.canInstall && <a className="text-button" href={status.releaseUrl} target="_blank" rel="noreferrer">Otevřít vydání na GitHubu</a>}
          <button type="button" className="text-button" disabled={checking || installing} onClick={() => void check()}>Zkontrolovat aktualizace</button>
        </div>}
      </div>
      {gameRunning && status?.canInstall && !installedUpdate && <p className="home-update-note">Aktualizaci lze spustit po skončení hry.</p>}
      {error && <p className="home-update-note field-error" role="alert">{error}</p>}
    </div>}
  </section>;
}

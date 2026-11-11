import type { useAppUpdate } from '../appUpdate.ts';

export default function AppUpdatePanel({ update, gameRunning }: {
  update: ReturnType<typeof useAppUpdate>;
  gameRunning: boolean;
}) {
  const { desktop, version, status, checking, installing, installedUpdate, error, check, install } = update;
  const message = installedUpdate ? `Verze ${installedUpdate} je nainstalovaná. Restartujte Šipky.`
    : installing ? 'Stahuji a instaluji aktualizaci. Potvrďte instalaci v systémovém dialogu.'
    : checking ? 'Kontroluji aktualizace…'
    : status?.updateAvailable ? `K dispozici je verze ${status.latest}`
    : status ? 'Aplikace je aktuální'
    : desktop ? 'Stav aktualizací neověřen' : 'Webový náhled';

  return <section className="home-update card" aria-label="Verze aplikace a aktualizace">
    <div className="home-update-summary">
      <strong>Verze aplikace {version}</strong>
      <span className={`status-line ${status && !status.updateAvailable ? 'online' : ''}`} role="status">{message}</span>
    </div>
    {desktop && !installedUpdate && <div className="home-update-actions">
      {status?.canInstall && <button className="primary" disabled={installing || gameRunning} onClick={() => void install()}>
        Aktualizovat
      </button>}
      {status?.updateAvailable && !status.canInstall && <a className="text-button" href={status.releaseUrl} target="_blank" rel="noreferrer">Vydání na GitHubu</a>}
      <button className="text-button" disabled={checking || installing} onClick={() => void check()}>Zkontrolovat</button>
    </div>}
    {gameRunning && status?.canInstall && <p className="home-update-note">Aktualizaci lze spustit po skončení hry.</p>}
    {error && <p className="home-update-note" role="alert">{error}</p>}
  </section>;
}

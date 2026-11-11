import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import packageInfo from '../package.json';
import { isAnyGameRunning } from './game/activeGame.ts';

type UpdateStatus = {
  installed: string;
  latest: string;
  updateAvailable: boolean;
  canInstall: boolean;
  releaseUrl: string;
};

export function useAppUpdate() {
  const desktop = isTauri();
  const [status, setStatus] = useState<UpdateStatus>();
  const [checking, setChecking] = useState(desktop);
  const [installing, setInstalling] = useState(false);
  const [installedUpdate, setInstalledUpdate] = useState<string>();
  const [error, setError] = useState<string>();
  const checkingRef = useRef(false);
  const installingRef = useRef(false);

  const check = useCallback(async () => {
    if (!desktop || checkingRef.current || installingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setStatus(undefined);
    setError(undefined);
    try {
      setStatus(await invoke<UpdateStatus>('check_app_update'));
    } catch {
      setError('Aktualizace se nepodařilo ověřit.');
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [desktop]);

  useEffect(() => { void check(); }, [check]);

  async function install() {
    if (!status?.canInstall || checking || installingRef.current || installedUpdate || isAnyGameRunning()) return;
    installingRef.current = true;
    setInstalling(true);
    setError(undefined);
    try {
      await invoke('install_app_update', { version: status.latest });
      setInstalledUpdate(status.latest);
    } catch (cause) {
      setError(typeof cause === 'string' ? cause : 'Aktualizaci se nepodařilo nainstalovat.');
    } finally {
      installingRef.current = false;
      setInstalling(false);
    }
  }

  return { desktop, version: status?.installed ?? packageInfo.version, status, checking, installing, installingRef,
    installedUpdate, error, check, install };
}

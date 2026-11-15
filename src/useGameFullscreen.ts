import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useGameFullscreen(gameScreen: boolean) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const changing = useRef(false);

  const change = useCallback(async (fullscreen: boolean) => {
    if (changing.current) return;
    changing.current = true;
    setPending(true);
    setError(undefined);
    try {
      await getCurrentWindow().setFullscreen(fullscreen);
      setActive(fullscreen);
    } catch {
      setError(fullscreen ? 'Nepodařilo se přejít na celou obrazovku.' : 'Nepodařilo se obnovit okno.');
    } finally {
      changing.current = false;
      setPending(false);
    }
  }, []);

  useEffect(() => {
    // Dokončí návrat do okna i při odchodu ze hry během zapínání celé obrazovky.
    if (!gameScreen && active) void change(false);
  }, [gameScreen, active, change]);

  return {
    available: gameScreen && isTauri(),
    active,
    pending,
    error,
    toggle: () => { if (gameScreen && isTauri()) void change(!active); },
  };
}

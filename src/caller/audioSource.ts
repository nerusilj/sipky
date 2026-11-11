import { invoke } from '@tauri-apps/api/core';

// Stejný binární IPC přenos jako u jmen; bez interního webového protokolu.
export async function loadAudioSource(url: string, desktop: boolean): Promise<{ url: string; release: () => void }> {
  if (!desktop || !url.startsWith('/sounds/')) return { url, release: () => {} };
  const bytes = await invoke<ArrayBuffer>('static_audio', { url });
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));
  if (header.length < 12 || String.fromCharCode(...header.slice(0, 4)) !== 'RIFF'
      || String.fromCharCode(...header.slice(8, 12)) !== 'WAVE') throw new Error(`Chybí WAV: ${url}`);
  const source = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  return { url: source, release: () => URL.revokeObjectURL(source) };
}

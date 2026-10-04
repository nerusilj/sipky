// Oslava konfetami po vyhraném legu nebo zápasu; kreslí ji komponenta Confetti.
export type Celebration = 'leg' | 'match';

const listeners = new Set<(kind: Celebration) => void>();

export function celebrate(kind: Celebration): void {
  listeners.forEach(listener => listener(kind));
}

export function onCelebrate(listener: (kind: Celebration) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Salvy z obou spodních rohů: [zpoždění ms, počet konfet na stranu]. Zápas má delší oslavu.
export const BURSTS: Record<Celebration, [number, number][]> = {
  leg: [[0, 70], [250, 40]],
  match: [[0, 90], [300, 60], [700, 70], [1200, 60], [1800, 80]],
};

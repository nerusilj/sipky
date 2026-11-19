import type { ShooterState } from './shooter.ts';

export function shooterScore(state: ShooterState) {
  const { settings, players, round, current, points, attempts, dartsThrown, visit, targets, hits, target, visitResult, finished, winners } = state;
  return { settings, players, round, current, points, attempts, dartsThrown, visit, targets, hits, target, visitResult, finished, winners };
}
export type ShooterScore = ReturnType<typeof shooterScore>;
export const shooterLengthText = (settings: ShooterScore['settings']) => settings.finish === 'race' ? 'První na 15 bodů' : `${settings.rounds} kol`;

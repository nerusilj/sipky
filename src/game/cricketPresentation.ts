import { cricketTotals } from './cricket.ts';
import type { CricketState } from './cricket.ts';

export function cricketScore(state: CricketState) {
  return {
    active: state.winner === undefined ? state.current : undefined,
    players: state.players.map((player, i) => {
      const { darts, mpr } = cricketTotals(state, i, state.leg);
      return { player, marks: state.marks[i], points: state.points[i], legsWon: state.legsWon[i], darts, mpr };
    }),
  };
}

export const START_SCORES = [101, 201, 301, 401, 501, 601, 701] as const;
export type StartScore = typeof START_SCORES[number];
export function isStartScore(value: unknown): value is StartScore {
  return START_SCORES.some(score => score === value);
}

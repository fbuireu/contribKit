export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export const clampLevel = (raw: number): ContributionLevel => {
  if (raw <= 0) return 0;
  if (raw >= 4) return 4;
  return raw as ContributionLevel;
};

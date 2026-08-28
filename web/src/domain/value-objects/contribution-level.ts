export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_BOUNDS = { min: 0, max: 4 } as const;

export const clampLevel = (raw: number): ContributionLevel =>
	(Number.isFinite(raw)
		? Math.min(LEVEL_BOUNDS.max, Math.max(LEVEL_BOUNDS.min, Math.round(raw)))
		: raw === Number.POSITIVE_INFINITY
			? LEVEL_BOUNDS.max
			: LEVEL_BOUNDS.min) as ContributionLevel;

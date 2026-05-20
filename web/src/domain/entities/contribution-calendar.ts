import type { ContributionDay } from './contribution-day';

export interface ContributionCalendar {
  readonly username: string;
  readonly days: readonly ContributionDay[];
  readonly total: number | null;
}

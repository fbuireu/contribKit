import type { ContributionCalendar } from '../entities/contribution-calendar';
import type { Failure } from '../failures/failure';
import type { Username } from '../value-objects/username';
import type { Year } from '../value-objects/year';

export interface ContributionsRepository {
  fetch(username: Username, year: Year | null): Promise<ContributionCalendar | Failure>;
}

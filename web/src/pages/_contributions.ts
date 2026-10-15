import { loadInitialContributions } from "@application/use-cases/load-initial-contributions";
import type { ContributionCalendar } from "@domain/entities/types";
import type { Failure } from "@domain/failures/failure";
import type { ContributionRepository } from "@domain/repositories/types";
import { githubHtmlContributionRepository } from "@infrastructure/github/github-html-contributions-repository";

export const loadContributions: ContributionRepository["fetchCalendar"] = (
	params,
): Promise<ContributionCalendar | Failure> => githubHtmlContributionRepository.fetchCalendar(params);

export const loadInitial = loadInitialContributions(loadContributions);

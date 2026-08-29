import { loadInitialContributions } from "@application/use-cases/load-initial-contributions";
import type { ContributionRepository } from "@domain/repositories/types";
import { githubHtmlContributionRepository } from "@infrastructure/github/github-html-contributions-repository";

export const loadContributions: ContributionRepository["fetchCalendar"] = (params) =>
	githubHtmlContributionRepository.fetchCalendar(params);

export const loadInitial = loadInitialContributions(loadContributions);

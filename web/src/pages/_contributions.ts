import { loadInitialContributions } from "@application/use-cases/load-initial-contributions";
import type { ContributionsRepository } from "@domain/repositories/types";
import { githubHtmlContributionsRepository } from "@infrastructure/github/github-html-contributions-repository";

export const loadContributions: ContributionsRepository["fetch"] = (params) =>
	githubHtmlContributionsRepository.fetch(params);

export const loadInitial = loadInitialContributions(loadContributions);

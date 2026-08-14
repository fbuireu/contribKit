import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { loadInitialContributions } from "@application/use-cases/load-initial-contributions";
import { githubHtmlContributionsRepository } from "@infrastructure/github/github-html-contributions-repository";

export const loadContributions = fetchContributions(githubHtmlContributionsRepository);

export const loadInitial = loadInitialContributions(loadContributions);

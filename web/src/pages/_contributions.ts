import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { loadInitialContributions } from "@application/use-cases/load-initial-contributions";
import { createGithubHtmlContributionsRepository } from "@infrastructure/github/create-github-html-contributions-repository";

const repository = createGithubHtmlContributionsRepository();

export const loadContributions = fetchContributions(repository);

export const loadInitial = loadInitialContributions(loadContributions);

import type { ContributionsRepository } from "@domain/repositories/contributions-repository";
import { githubHtmlContributionsRepository } from "./github-html-contributions-repository";

export const createGithubHtmlContributionsRepository = (): ContributionsRepository => githubHtmlContributionsRepository;

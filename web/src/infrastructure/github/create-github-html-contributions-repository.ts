import type { ContributionsRepository } from "@domain/repositories/types";
import { githubHtmlContributionsRepository } from "./github-html-contributions-repository";

export const createGithubHtmlContributionsRepository = (): ContributionsRepository => githubHtmlContributionsRepository;

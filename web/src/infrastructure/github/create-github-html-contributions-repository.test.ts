import { describe, expect, it } from "vitest";
import { createGithubHtmlContributionsRepository } from "./create-github-html-contributions-repository";

describe("createGithubHtmlContributionsRepository", () => {
	it("returns a repository exposing a fetch method", () => {
		const repository = createGithubHtmlContributionsRepository();
		expect(typeof repository.fetch).toBe("function");
	});
});

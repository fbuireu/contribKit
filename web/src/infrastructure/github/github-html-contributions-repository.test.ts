import type { Username } from "@domain/value-objects/username";
import type { Year } from "@domain/value-objects/year";
import { afterEach, describe, expect, it, vi } from "vitest";
import { githubHtmlContributionsRepository } from "./github-html-contributions-repository";

const username = { _tag: "Username", value: "torvalds" } as Username;

const HTML = `
<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="cell-1"></td>
<td class="ContributionCalendar-day" data-date="2024-01-02" data-level="0" id="cell-2"></td>
<tool-tip class="sr-only" for="cell-1">5 contributions on January 1st.</tool-tip>
<tool-tip class="sr-only" for="cell-2">No contributions on January 2nd.</tool-tip>
`;

const stubFetch = (impl: typeof fetch): void => {
	vi.stubGlobal("fetch", vi.fn(impl));
};

afterEach(() => vi.unstubAllGlobals());

describe("githubHtmlContributionsRepository.fetch", () => {
	it("parses days, levels and counts from the HTML", async () => {
		stubFetch(async () => new Response(HTML, { status: 200 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result).toBe(true);
		if (!("days" in result)) return;
		expect(result.username).toBe("torvalds");
		expect(result.days).toEqual([
			{ date: "2024-01-01", level: 2, count: 5 },
			{ date: "2024-01-02", level: 0, count: null },
		]);
		expect(result.total).toBe(5);
	});

	it("returns NotFound on a 404", async () => {
		stubFetch(async () => new Response("", { status: 404 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toEqual({ kind: "NotFound", username: "torvalds" });
	});

	it("returns Network on a non-ok response", async () => {
		stubFetch(async () => new Response("", { status: 503 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toEqual({ kind: "Network", status: 503, message: "GitHub returned 503" });
	});

	it("returns Network when fetch throws", async () => {
		stubFetch(async () => {
			throw new Error("boom");
		});

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toEqual({ kind: "Network", status: undefined, message: "boom" });
	});

	it("returns Parse when no contribution days are found", async () => {
		stubFetch(async () => new Response("<html>nothing here</html>", { status: 200 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toEqual({ kind: "Parse", message: "Could not parse contributions" });
	});

	it("reports an unknown total rather than zero when no tool-tip parses", async () => {
		stubFetch(
			async () =>
				new Response('<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="a"></td>', {
					status: 200,
				}),
		);

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result).toBe(true);
		if (!("days" in result)) return;
		expect(result.total).toBeNull();
		expect(result.days[0].count).toBeNull();
	});

	it("reads a Count that GitHub indented onto its own line", async () => {
		stubFetch(
			async () =>
				new Response(
					[
						'<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="a"></td>',
						'<tool-tip for="a">\n      5 contributions on January 1st\n    </tool-tip>',
					].join(""),
					{ status: 200 },
				),
		);

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result).toBe(true);
		if (!("days" in result)) return;
		expect(result.days[0].count).toBe(5);
	});

	it("voids the total when only some tool-tips parse, rather than understating it", async () => {
		stubFetch(
			async () =>
				new Response(
					[
						'<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="a"></td>',
						'<td class="ContributionCalendar-day" data-date="2024-01-02" data-level="3" id="b"></td>',
						'<tool-tip for="a">5 contributions</tool-tip>',
					].join(""),
					{ status: 200 },
				),
		);

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result).toBe(true);
		if (!("days" in result)) return;
		expect(result.days[1].count).toBeNull();
		expect(result.total).toBeNull();
	});

	it("still totals when every day whose Count is unknown is a level-0 day", async () => {
		stubFetch(
			async () =>
				new Response(
					[
						'<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="a"></td>',
						'<td class="ContributionCalendar-day" data-date="2024-01-02" data-level="0"></td>',
						'<tool-tip for="a">5 contributions</tool-tip>',
					].join(""),
					{ status: 200 },
				),
		);

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result).toBe(true);
		if (!("days" in result)) return;
		expect(result.total).toBe(5);
	});

	it("leaves the current year open-ended so it ends today", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const year = { _tag: "Year", value: new Date().getFullYear() } as Year;

		await githubHtmlContributionsRepository.fetch({ username, year });

		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain(`from=${year.value}-01-01`);
		expect(calledUrl).not.toContain("to=");
	});

	it("adds from/to query params for a past year", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const year = { _tag: "Year", value: 2020 } as Year;

		await githubHtmlContributionsRepository.fetch({ username, year });

		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain("from=2020-01-01");
		expect(calledUrl).toContain("to=2020-12-31");
	});
});

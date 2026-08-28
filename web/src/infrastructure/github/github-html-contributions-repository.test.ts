import { FailureKind } from "@domain/failures/failure";
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
	it("reads a grouped Count in full rather than truncating it at the separator", async () => {
		const grouped = `
<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="4" id="cell-1"></td>
<tool-tip class="sr-only" for="cell-1">1,234 contributions on January 1st.</tool-tip>
`;
		stubFetch(async () => new Response(grouped, { status: 200 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect("days" in result && result.days[0].count, "truncating to 1 reports a wrong number as an exact one").toBe(
			1234,
		);
	});

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

	it("tells a 429 apart from an outage, so the reader is not told GitHub is unreachable", async () => {
		stubFetch(async () => new Response("", { status: 429, headers: { "retry-after": "120" } }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toEqual({
			kind: FailureKind.RateLimited,
			message: "GitHub is rate-limiting this Worker",
			retryAfterSeconds: 120,
		});
	});

	it("reads the other Retry-After form, an HTTP date", async () => {
		const at = new Date(Date.now() + 60_000).toUTCString();
		stubFetch(async () => new Response("", { status: 429, headers: { "retry-after": at } }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toMatchObject({ kind: FailureKind.RateLimited });
		if (!("retryAfterSeconds" in result)) return;
		expect(result.retryAfterSeconds).toBeGreaterThan(50);
		expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
	});

	it("survives a 429 with no Retry-After at all", async () => {
		stubFetch(async () => new Response("", { status: 429 }));

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toMatchObject({ kind: FailureKind.RateLimited, retryAfterSeconds: null });
	});

	it("gives up on a hung GitHub rather than holding the invocation open", async () => {
		let passedSignal: AbortSignal | undefined;
		stubFetch(async (_url, init) => {
			passedSignal = (init as RequestInit | undefined)?.signal ?? undefined;
			return new Response(HTML, { status: 200 });
		});

		await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(passedSignal).toBeInstanceOf(AbortSignal);
	});

	it("turns an aborted request into a Failure, never a throw out of the layer", async () => {
		stubFetch(async () => {
			throw new DOMException("The operation was aborted", "TimeoutError");
		});

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toMatchObject({ kind: FailureKind.Network });
	});

	it("turns an abort mid-body into a Failure too, which the fetch guard alone does not cover", async () => {
		stubFetch(
			async () =>
				({
					status: 200,
					ok: true,
					headers: new Headers(),
					text: () => Promise.reject(new DOMException("aborted", "TimeoutError")),
				}) as unknown as Response,
		);

		const result = await githubHtmlContributionsRepository.fetch({ username, year: null });

		expect(result).toMatchObject({ kind: FailureKind.Network });
	});

	it("reads Retry-After only in the two forms the RFC allows", async () => {
		const parsed = async (retryAfter: string) => {
			stubFetch(async () => new Response("", { status: 429, headers: { "retry-after": retryAfter } }));
			const result = await githubHtmlContributionsRepository.fetch({ username, year: null });
			return "retryAfterSeconds" in result ? result.retryAfterSeconds : undefined;
		};

		expect(await parsed(" ")).toBeNull();
		expect(await parsed("5.5")).toBeNull();
		expect(await parsed("-1")).toBeNull();
		expect(await parsed("nonsense")).toBeNull();
		expect(await parsed(" 90 ")).toBe(90);
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

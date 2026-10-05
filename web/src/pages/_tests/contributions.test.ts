import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../api/contributions";

const HTML = `<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="c1"></td><tool-tip for="c1">5 contributions</tool-tip>`;

const call = (query: string): Promise<Response> =>
	GET({ url: new URL(`https://contribkit.app/api/contributions${query}`) } as never) as Promise<Response>;

const loggedLines = (spy: { mock: { calls: unknown[][] } }): Record<string, unknown>[] =>
	spy.mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("GET /api/contributions", () => {
	it("400 when user is missing", async () => {
		const res = await call("");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Missing required parameter: user",
			kind: "InvalidInput",
			field: "username",
		});
	});

	it("400 when user is present but empty, which the shape check rejects before any value object", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);

		const res = await call("?user=&year=2024");

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "Missing required parameter: user",
			kind: "InvalidInput",
			field: "username",
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("names the parameter it rejected, because a machine consumer cannot guess", async () => {
		const badUser = await call("?user=foo_bar");
		const badYear = await call("?user=torvalds&year=1999");

		expect(await badUser.json()).toEqual({ error: "Invalid GitHub username", kind: "InvalidInput", field: "username" });
		expect(await badYear.json()).toMatchObject({ kind: "InvalidInput", field: "year" });
	});

	it("names the kind of every failure GitHub's answer causes, beside the message it already carried", async () => {
		const answers: [Response, Record<string, string>][] = [
			[new Response("", { status: 404 }), { error: "User not found", kind: "NotFound" }],
			[new Response("", { status: 503 }), { error: "GitHub returned 503", kind: "Upstream" }],
			[new Response("<p>no calendar</p>", { status: 200 }), { error: "Could not parse contributions", kind: "Parse" }],
			[new Response("", { status: 429 }), { error: "GitHub is rate-limiting this Worker", kind: "RateLimited" }],
		];

		for (const [answer, body] of answers) {
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => answer),
			);

			expect(await (await call("?user=torvalds")).json()).toEqual(body);
		}
	});

	it("keeps the platform's own wording out of the body and in the log line when the request itself fails", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("fetch failed: socket hang up");
			}),
		);

		const res = await call("?user=torvalds");

		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ error: "Could not reach GitHub", kind: "Network" });
		expect(loggedLines(errors)).toEqual([
			expect.objectContaining({
				level: "error",
				message: "GitHub contributions fetch failed",
				kind: "Network",
				reason: "fetch failed: socket hang up",
				status: 502,
				endpoint: "api",
				username: "torvalds",
			}),
		]);
	});

	it("logs an answer GitHub refused under its own kind, with the status in the reason", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 503 })),
		);

		await call("?user=torvalds");

		expect(loggedLines(errors)).toEqual([
			expect.objectContaining({ kind: "Upstream", reason: "GitHub returned 503", status: 502, endpoint: "api" }),
		]);
	});

	it("400 on an invalid username", async () => {
		const res = await call("?user=foo_bar");
		expect(res.status).toBe(400);
	});

	it("keeps every failure out of the caches, so a retry is not answered by a stored error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 404 })),
		);

		for (const query of ["", "?user=foo_bar", "?user=torvalds&year=1999", "?user=ghost"]) {
			const res = await call(query);

			expect(res.status, query).not.toBe(200);
			expect(res.headers.get("Cache-Control"), query).toBe("no-store");
		}
	});

	it("returns the calendar for a valid user", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const res = await call("?user=torvalds");

		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
		const body = (await res.json()) as { username: string; days: unknown[]; cells: unknown[] };
		expect(body.username).toBe("torvalds");
		expect(body.days).toEqual([{ date: "2024-01-01", level: 2, count: 5 }]);
		expect(body.cells).toEqual(body.days);
	});

	it("404 when the user is not found", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 404 })),
		);

		const res = await call("?user=ghost");

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "User not found", kind: "NotFound" });
	});

	it("502 when GitHub is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 503 })),
		);

		const res = await call("?user=torvalds");

		expect(res.status).toBe(502);
	});

	it("400 on a year the domain rejects, rather than quietly using another one", async () => {
		const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", fetchSpy);

		const res = await call("?user=torvalds&year=1999");

		expect(res.status).toBe(400);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("asks GitHub for the year it was given, bounded at both ends for a past one", async () => {
		const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", fetchSpy);

		await call("?user=torvalds&year=2024");

		const requested = String(fetchSpy.mock.calls[0]?.[0]);
		expect(requested).toContain("from=2024-01-01");
		expect(requested).toContain("to=2024-12-31");
	});

	it("asks for the rolling window when no year is given", async () => {
		const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", fetchSpy);

		await call("?user=torvalds");

		expect(String(fetchSpy.mock.calls[0]?.[0])).not.toContain("from=");
	});

	it("429 passes GitHub's Retry-After on rather than dropping it", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "120" } })),
		);

		const res = await call("?user=torvalds");

		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("120");
	});

	it("429 with no Retry-After sets no header, rather than inventing a wait", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429 })),
		);

		const res = await call("?user=torvalds");

		expect(res.status).toBe(429);
		expect(res.headers.has("Retry-After")).toBe(false);
	});

	it("answers with a null total rather than a sum that skipped an unknown Count", async () => {
		const partial = `${HTML}<td class="ContributionCalendar-day" data-date="2024-01-02" data-level="3" id="c2"></td>`;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(partial, { status: 200 })),
		);

		const res = await call("?user=torvalds");

		expect(((await res.json()) as { total: number | null }).total).toBeNull();
	});
});

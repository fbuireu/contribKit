import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@logtail/edge", () => ({
	Logtail: vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		withExecutionContext() {
			return this;
		},
	})),
}));

import { GET } from "../api/contributions";

const HTML = `<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="c1"></td><tool-tip for="c1">5 contributions</tool-tip>`;

const call = (query: string): Promise<Response> =>
	GET({ url: new URL(`https://contribkit.app/api/contributions${query}`), locals: {} } as never) as Promise<Response>;

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/contributions", () => {
	it("400 when user is missing", async () => {
		const res = await call("");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Missing required parameter: user" });
	});

	it("names the parameter it rejected, because a machine consumer cannot guess", async () => {
		const badUser = await call("?user=foo_bar");
		const badYear = await call("?user=torvalds&year=1999");

		expect(await badUser.json()).toMatchObject({ field: "username" });
		expect(await badYear.json()).toMatchObject({ field: "year" });
	});

	it("400 on an invalid username", async () => {
		const res = await call("?user=foo_bar");
		expect(res.status).toBe(400);
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
		expect(await res.json()).toEqual({ error: "User not found" });
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

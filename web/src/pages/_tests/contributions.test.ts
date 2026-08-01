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
});

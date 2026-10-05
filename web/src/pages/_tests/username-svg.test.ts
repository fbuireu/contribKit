import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../user/[username].svg";

const HTML = `<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="c1"></td><tool-tip for="c1">5 contributions</tool-tip>`;

interface CallParams {
	username: string;
	query?: string;
}

const call = ({ username, query = "" }: CallParams): Promise<Response> =>
	GET({
		params: { username },
		url: new URL(`https://contribkit.app/user/${username}.svg${query}`),
	} as never) as Promise<Response>;

const loggedLines = (spy: { mock: { calls: unknown[][] } }): Record<string, unknown>[] =>
	spy.mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("GET /user/[username].svg", () => {
	it("returns an SVG image for a valid user", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const res = await call({ username: "torvalds" });

		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
		expect((await res.text()).startsWith("<svg")).toBe(true);
	});

	it("answers 400 text/plain to the smoke run's malformed Username without a request leaving the Worker", async () => {
		const request = vi.fn(async () => new Response(HTML, { status: 200 }));
		vi.stubGlobal("fetch", request);

		const res = await call({ username: "foo_bar" });

		expect(request).not.toHaveBeenCalled();
		expect(res.status).toBe(400);
		expect(res.headers.get("Content-Type")).toBe("text/plain");
		expect(await res.text()).toBe("Invalid GitHub username");
	});

	it("404 'User not found' when the user does not exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 404 })),
		);

		const res = await call({ username: "ghost" });

		expect(res.status).toBe(404);
		expect(await res.text()).toBe("User not found");
	});

	it("keeps the platform's own wording out of the body and in the log line when the request itself fails", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("fetch failed: socket hang up");
			}),
		);

		const res = await call({ username: "torvalds" });

		expect(res.status).toBe(502);
		expect(await res.text()).toBe("Could not reach GitHub");
		expect(loggedLines(errors)).toEqual([
			expect.objectContaining({
				level: "error",
				message: "GitHub contributions fetch failed",
				kind: "Network",
				reason: "fetch failed: socket hang up",
				status: 502,
				endpoint: "svg",
				username: "torvalds",
			}),
		]);
	});

	it("passes GitHub's Retry-After on, even though the body is text", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "90" } })),
		);

		const res = await call({ username: "torvalds" });

		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("90");
		expect(res.headers.get("Content-Type")).toContain("text/plain");
	});

	it("sends no Retry-After when GitHub named no wait", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429 })),
		);

		const res = await call({ username: "torvalds" });

		expect(res.status).toBe(429);
		expect(res.headers.has("Retry-After")).toBe(false);
	});

	it("keeps every failure out of the caches an embed passes through", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 404 })),
		);

		for (const res of [await call({ username: "ghost" }), await call({ username: "foo_bar" })]) {
			expect(res.status, await res.text()).not.toBe(200);
			expect(res.headers.get("Cache-Control")).toBe("no-store");
		}
	});

	it("honors the shape query param", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const res = await call({ username: "torvalds", query: "?shape=hex" });

		expect(await res.text()).toContain("<polygon");
	});

	it("falls back to the default Cell Shape rather than failing on a shape nobody ships", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const [named, unnamed] = await Promise.all([
			call({ username: "torvalds", query: "?shape=triangle" }).then((res) => res.text()),
			call({ username: "torvalds" }).then((res) => res.text()),
		]);

		expect(named).toBe(unnamed);
	});

	it("refuses a route reached with no username segment at all", async () => {
		const res = await GET({
			params: {},
			url: new URL("https://contribkit.app/user/.svg"),
		} as never);

		expect(res.status).toBe(400);
		expect(res.headers.get("Content-Type")).toBe("text/plain");
	});
});

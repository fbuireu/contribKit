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

import { GET } from "../user/[username].svg";

const HTML = `<td class="ContributionCalendar-day" data-date="2024-01-01" data-level="2" id="c1"></td><tool-tip for="c1">5 contributions</tool-tip>`;

const call = (username: string, query = ""): Promise<Response> =>
	GET({
		params: { username },
		url: new URL(`https://contribkit.app/user/${username}.svg${query}`),
		locals: {},
	} as never) as Promise<Response>;

afterEach(() => vi.unstubAllGlobals());

describe("GET /user/[username].svg", () => {
	it("returns an SVG image for a valid user", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const res = await call("torvalds");

		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
		expect((await res.text()).startsWith("<svg")).toBe(true);
	});

	it("400 text/plain on an invalid username", async () => {
		const res = await call("foo_bar");

		expect(res.status).toBe(400);
		expect(res.headers.get("Content-Type")).toBe("text/plain");
	});

	it("404 'User not found' when the user does not exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 404 })),
		);

		const res = await call("ghost");

		expect(res.status).toBe(404);
		expect(await res.text()).toBe("User not found");
	});

	it("passes GitHub's Retry-After on, even though the body is text", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "90" } })),
		);

		const res = await call("torvalds");

		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("90");
		expect(res.headers.get("Content-Type")).toContain("text/plain");
	});

	it("sends no Retry-After when GitHub named no wait", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("", { status: 429 })),
		);

		const res = await call("torvalds");

		expect(res.status).toBe(429);
		expect(res.headers.has("Retry-After")).toBe(false);
	});

	it("honors the shape query param", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(HTML, { status: 200 })),
		);

		const res = await call("torvalds", "?shape=hex");

		expect(await res.text()).toContain("<polygon");
	});
});

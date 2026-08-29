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

const boom = new Error("the renderer exploded");

vi.mock("../_contributions", () => ({
	loadContributions: vi.fn(async () => {
		throw boom;
	}),
}));

const logServerError = vi.fn();
vi.mock("@application/http/failure-log", async (importOriginal) => ({
	...(await importOriginal<typeof import("@application/http/failure-log")>()),
	logServerError: (params: unknown) => logServerError(params),
}));

import { GET as apiGet } from "../api/contributions";
import { GET as svgGet } from "../user/[username].svg";

afterEach(() => {
	logServerError.mockClear();
	vi.unstubAllGlobals();
});

describe("an unexpected throw never escapes a public route", () => {
	it("answers the JSON API with a structured 500 and logs it", async () => {
		const res = (await apiGet({
			url: new URL("https://contribkit.app/api/contributions?user=torvalds"),
			locals: {},
		} as never)) as Response;

		expect(res.status).toBe(500);
		expect(res.headers.get("Content-Type")).toContain("application/json");
		expect(await res.json()).toEqual({ error: "Something went wrong. Please try again." });
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(logServerError).toHaveBeenCalledTimes(1);
	});

	it("answers the SVG endpoint with a plain-text 500 and logs it", async () => {
		const res = (await svgGet({
			url: new URL("https://contribkit.app/user/torvalds.svg"),
			params: { username: "torvalds" },
			locals: {},
		} as never)) as Response;

		expect(res.status).toBe(500);
		expect(res.headers.get("Content-Type")).toContain("text/plain");
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(logServerError).toHaveBeenCalledTimes(1);
	});

	it("never puts the thrown message in the body, because a public endpoint is not a stack trace", async () => {
		const res = (await svgGet({
			url: new URL("https://contribkit.app/user/torvalds.svg"),
			params: { username: "torvalds" },
			locals: {},
		} as never)) as Response;

		expect(await res.text()).not.toContain(boom.message);
	});
});

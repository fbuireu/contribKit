import { afterEach, describe, expect, it, vi } from "vitest";
import { readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

const stubLocation = (search: string, pushState = vi.fn()) => {
	vi.stubGlobal("location", { search, href: "https://x.test/" });
	vi.stubGlobal("history", { pushState });
};

describe("readUsernameFromUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads the user param", () => {
		stubLocation("?user=torvalds");
		expect(readUsernameFromUrl("default")).toBe("torvalds");
	});

	it("falls back when the param is missing", () => {
		stubLocation("");
		expect(readUsernameFromUrl("default")).toBe("default");
	});
});

describe("readYearFromUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads a valid past year", () => {
		stubLocation("?year=2022");
		expect(readYearFromUrl(2024)).toBe(2022);
	});

	it("clamps a future year to the current year", () => {
		stubLocation("?year=2099");
		expect(readYearFromUrl(2024)).toBe(2024);
	});

	it("uses the current year when missing", () => {
		stubLocation("");
		expect(readYearFromUrl(2024)).toBe(2024);
	});
});

describe("syncUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("pushes the user and a non-current year", () => {
		const pushState = vi.fn();
		stubLocation("", pushState);
		syncUrl({ username: "torvalds", year: 2022, currentYear: 2024 });
		const url = pushState.mock.calls[0][2] as URL;
		expect(url.searchParams.get("user")).toBe("torvalds");
		expect(url.searchParams.get("year")).toBe("2022");
	});

	it("omits the year when it equals the current year", () => {
		const pushState = vi.fn();
		stubLocation("", pushState);
		syncUrl({ username: "torvalds", year: 2024, currentYear: 2024 });
		const url = pushState.mock.calls[0][2] as URL;
		expect(url.searchParams.has("year")).toBe(false);
	});
});

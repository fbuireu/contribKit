import { afterEach, describe, expect, it, vi } from "vitest";
import { readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

type StubLocationParams = { search: string; pushState?: ReturnType<typeof vi.fn> };

const stubLocation = ({ search, pushState = vi.fn() }: StubLocationParams) => {
	vi.stubGlobal("location", { search, href: "https://x.test/" });
	vi.stubGlobal("history", { pushState });
};

describe("readUsernameFromUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads the user param", () => {
		stubLocation({ search: "?user=torvalds" });
		expect(readUsernameFromUrl("default")).toBe("torvalds");
	});

	it("falls back when the param is missing", () => {
		stubLocation({ search: "" });
		expect(readUsernameFromUrl("default")).toBe("default");
	});
});

describe("readYearFromUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads a valid past year", () => {
		stubLocation({ search: "?year=2022" });
		expect(readYearFromUrl(2024)).toBe(2022);
	});

	it("clamps a future year to the current year", () => {
		stubLocation({ search: "?year=2099" });
		expect(readYearFromUrl(2024)).toBe(2024);
	});

	it("uses the current year when missing", () => {
		stubLocation({ search: "" });
		expect(readYearFromUrl(2024)).toBe(2024);
	});
});

describe("syncUrl", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("pushes the user and a non-current year", () => {
		const pushState = vi.fn();
		stubLocation({ search: "", pushState: pushState });
		syncUrl({ username: "torvalds", year: 2022, currentYear: 2024 });
		const url = pushState.mock.calls[0][2] as URL;
		expect(url.searchParams.get("user")).toBe("torvalds");
		expect(url.searchParams.get("year")).toBe("2022");
	});

	it("omits the year when it equals the current year", () => {
		const pushState = vi.fn();
		stubLocation({ search: "", pushState: pushState });
		syncUrl({ username: "torvalds", year: 2024, currentYear: 2024 });
		const url = pushState.mock.calls[0][2] as URL;
		expect(url.searchParams.has("year")).toBe(false);
	});
});

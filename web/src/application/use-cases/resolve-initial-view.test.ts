import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { type IsoDate, parseIsoDate } from "@domain/value-objects/iso-date";
import { DEFAULT_USERNAME, isUsername, MAX_USERNAME_LENGTH, parseUsername } from "@domain/value-objects/username";
import { describe, expect, it } from "vitest";
import {
	cacheControlFor,
	DaySource,
	daySourceFor,
	initialStatsFor,
	resolveViewerIdentity,
} from "./resolve-initial-view";

describe("resolveViewerIdentity", () => {
	it("prefers the requested username over the saved one", () => {
		expect(resolveViewerIdentity({ requestedUsername: "torvalds", savedUsername: "gaearon" }).username).toBe(
			"torvalds",
		);
	});

	it("falls back to the saved username", () => {
		expect(resolveViewerIdentity({ savedUsername: "gaearon" }).username).toBe("gaearon");
	});

	it("falls back to the default when neither is given", () => {
		expect(resolveViewerIdentity({}).username).toBe(DEFAULT_USERNAME);
	});

	it("ignores a saved username the domain rejects, rather than trusting the cookie", () => {
		const identity = resolveViewerIdentity({ savedUsername: "-not-a-handle-" });

		expect(identity.username).toBe(DEFAULT_USERNAME);
		expect(identity.isExplicit).toBe(false);
	});

	it("passes a requested username the domain rejects straight through, so the loader can answer 400", () => {
		const identity = resolveViewerIdentity({ requestedUsername: "not a handle", savedUsername: "gaearon" });

		expect(identity.username).toBe("not a handle");
		expect(identity.isExplicit).toBe(true);
	});

	it("never answers a rejected request with somebody else's calendar", () => {
		for (const requestedUsername of ["not a handle", "-leading-dash", "a".repeat(40)]) {
			const identity = resolveViewerIdentity({ requestedUsername, savedUsername: "gaearon" });

			expect(identity.username).not.toBe(DEFAULT_USERNAME);
			expect(identity.username).not.toBe("gaearon");
		}
	});

	it("bounds an overlong request without ever truncating it into a valid username", () => {
		const identity = resolveViewerIdentity({ requestedUsername: "a".repeat(5000) });

		expect(identity.username.length).toBe(MAX_USERNAME_LENGTH + 1);
		expect(isUsername(parseUsername(identity.username))).toBe(false);
	});

	it("trims what it is given", () => {
		expect(resolveViewerIdentity({ requestedUsername: "  torvalds  " }).username).toBe("torvalds");
	});

	it("treats an empty query param as absent", () => {
		expect(resolveViewerIdentity({ requestedUsername: "", savedUsername: "gaearon" }).username).toBe("gaearon");
	});

	describe("isExplicit", () => {
		it("is true for a requested username", () => {
			expect(resolveViewerIdentity({ requestedUsername: "torvalds" }).isExplicit).toBe(true);
		});

		it("is true for a returning visitor carrying the cookie", () => {
			expect(resolveViewerIdentity({ savedUsername: "gaearon" }).isExplicit).toBe(true);
		});

		it("is false for a first-time visitor, who must never see someone else's failure", () => {
			expect(resolveViewerIdentity({}).isExplicit).toBe(false);
		});
	});
});

describe("cacheControlFor", () => {
	it("caches for an hour once a visitor asked for someone and the calendar loaded", () => {
		expect(cacheControlFor({ loaded: true, isExplicit: true })).toBe(
			"private, max-age=3600, stale-while-revalidate=86400",
		);
	});

	it("caches a returning visitor's calendar too, not only a requested one", () => {
		const { isExplicit } = resolveViewerIdentity({ savedUsername: "gaearon" });

		expect(cacheControlFor({ loaded: true, isExplicit })).toContain("max-age=3600");
	});

	it("never stores the default view, loaded or not", () => {
		for (const loaded of [true, false]) {
			expect(cacheControlFor({ loaded, isExplicit: false }), String(loaded)).toBe("private, no-store");
		}
	});

	it("never stores a failed load, so a rejected username, a 404 or a 502 is not cached for an hour", () => {
		expect(cacheControlFor({ loaded: false, isExplicit: true })).toBe("private, no-store");
	});

	it("is always private, so a shared cache never serves one visitor's calendar to another", () => {
		for (const loaded of [true, false]) {
			for (const isExplicit of [true, false]) {
				expect(cacheControlFor({ loaded, isExplicit }).startsWith("private"), `${loaded}, ${isExplicit}`).toBe(true);
			}
		}
	});
});

describe("daySourceFor", () => {
	it("uses the loaded days when the fetch succeeded", () => {
		expect(daySourceFor({ loaded: true, isExplicit: true })).toBe(DaySource.Loaded);
	});

	it("shows an empty grid, never the placeholder, when someone asked for a user and the fetch failed", () => {
		expect(daySourceFor({ loaded: false, isExplicit: true })).toBe(DaySource.Empty);
	});

	it("shows the placeholder when nobody asked for anyone", () => {
		expect(daySourceFor({ loaded: false, isExplicit: false })).toBe(DaySource.Placeholder);
	});
});

describe("initialStatsFor", () => {
	const day = (params: ContributionDayParams): ContributionDay => {
		const built = contributionDay(params);
		if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
		return built;
	};
	const iso = (raw: string): IsoDate => {
		const parsed = parseIsoDate(raw);
		if (isFailure(parsed)) throw new Error(`fixture is not a calendar date: ${raw}`);
		return parsed;
	};
	const today = iso("2026-09-30");
	const loaded = buildGridFromApi({
		days: [day({ date: "2026-09-29", level: 1, count: 3 }), day({ date: "2026-09-30", level: 2, count: 5 })],
		year: 2026,
	});

	it("clears every figure when an asked-for calendar did not load, because zero is a number", () => {
		const empty = buildGridFromApi({ days: [], year: 2026 });

		expect(initialStatsFor({ source: DaySource.Empty, days: empty, year: 2026, today, scrapedTotal: null })).toEqual({
			totalContributions: null,
			currentStreak: null,
			longestStreak: null,
		});
	});

	it("computes the figures of a loaded calendar, the scraped total winning", () => {
		expect(initialStatsFor({ source: DaySource.Loaded, days: loaded, year: 2026, today, scrapedTotal: 42 })).toEqual({
			totalContributions: 42,
			currentStreak: 2,
			longestStreak: 2,
		});
	});

	it("computes the placeholder's figures, the one place a Count is invented", () => {
		expect(
			initialStatsFor({ source: DaySource.Placeholder, days: loaded, year: 2026, today, scrapedTotal: null }),
		).toEqual({
			totalContributions: 8,
			currentStreak: 2,
			longestStreak: 2,
		});
	});
});

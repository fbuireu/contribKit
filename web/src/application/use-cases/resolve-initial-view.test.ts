import { DEFAULT_USERNAME, isUsername, MAX_USERNAME_LENGTH, parseUsername } from "@domain/value-objects/username";
import { describe, expect, it } from "vitest";
import { DaySource, daySourceFor, resolveViewerIdentity } from "./resolve-initial-view";

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

	describe("cacheControl", () => {
		it("caches for an hour once a visitor is asking for someone", () => {
			expect(resolveViewerIdentity({ requestedUsername: "torvalds" }).cacheControl).toContain("max-age=3600");
		});

		it("caches the cookie case too, not only the query param", () => {
			expect(resolveViewerIdentity({ savedUsername: "gaearon" }).cacheControl).toContain("max-age=3600");
		});

		it("never stores the default view", () => {
			expect(resolveViewerIdentity({}).cacheControl).toBe("private, no-store");
		});

		it("never stores a view it could not serve, so an error page is not cached for an hour", () => {
			for (const requestedUsername of ["not a handle", "-leading-dash", "a".repeat(40)]) {
				expect(resolveViewerIdentity({ requestedUsername }).cacheControl, requestedUsername).toBe("private, no-store");
			}
		});

		it("is always private, so a shared cache never serves one visitor's calendar to another", () => {
			for (const identity of [resolveViewerIdentity({}), resolveViewerIdentity({ requestedUsername: "torvalds" })]) {
				expect(identity.cacheControl.startsWith("private")).toBe(true);
			}
		});
	});
});

describe("daySourceFor", () => {
	it("uses the loaded days when the fetch succeeded", () => {
		expect(daySourceFor({ loaded: true, isExplicit: true })).toBe(DaySource.Loaded);
	});

	it("shows an empty grid when someone asked for a user and the fetch failed", () => {
		expect(daySourceFor({ loaded: false, isExplicit: true })).toBe(DaySource.Empty);
	});

	it("shows the placeholder when nobody asked for anyone", () => {
		expect(daySourceFor({ loaded: false, isExplicit: false })).toBe(DaySource.Placeholder);
	});

	it("never shows the placeholder to a visitor who asked, which would invent data for them", () => {
		expect(daySourceFor({ loaded: false, isExplicit: true })).not.toBe(DaySource.Placeholder);
	});
});

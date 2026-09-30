// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readUsernameCookie, seedUsernameCookie, writeUsernameCookie } from "./cookie";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

beforeEach(async () => {
	vi.stubGlobal("cookieStore", undefined);
	await writeUsernameCookie("");
	vi.unstubAllGlobals();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("username-cookie", () => {
	it("reads a trimmed cookie value", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue({ value: " torvalds " }) });
		expect(await readUsernameCookie()).toBe("torvalds");
	});

	it("returns null when the cookie is absent", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue(undefined) });
		expect(await readUsernameCookie()).toBeNull();
	});

	it("returns null when the Cookie Store hands back a value that is not a string", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue({ value: 42 }) });
		expect(await readUsernameCookie()).toBeNull();
	});

	it("returns null when cookieStore throws", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockRejectedValue(new Error("no")) });
		expect(await readUsernameCookie()).toBeNull();
	});

	it("writes the cookie with a one-week expiry", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(Date.UTC(2026, 8, 30, 12, 0, 0)));
		const set = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("cookieStore", { set });
		await writeUsernameCookie("torvalds");
		expect(set).toHaveBeenCalledWith({
			name: "ck_user",
			value: "torvalds",
			expires: Date.UTC(2026, 8, 30, 12, 0, 0) + ONE_WEEK_MS,
			path: "/",
			sameSite: "lax",
		});
	});

	it("seeds only when no cookie exists yet", async () => {
		const set = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue(undefined), set });
		await seedUsernameCookie("torvalds");
		expect(set).toHaveBeenCalledOnce();
	});

	it("does not seed when a cookie already exists", async () => {
		const set = vi.fn();
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue({ value: "existing" }), set });
		await seedUsernameCookie("torvalds");
		expect(set).not.toHaveBeenCalled();
	});

	it("falls back to document.cookie where the Cookie Store API is absent", async () => {
		vi.stubGlobal("cookieStore", undefined);
		expect(await readUsernameCookie()).toBeNull();
		await writeUsernameCookie("torvalds");
		expect(document.cookie).toContain("ck_user=torvalds");
		expect(await readUsernameCookie()).toBe("torvalds");
	});
});

describe("username-cookie without the Cookie Store API", () => {
	beforeEach(() => {
		vi.stubGlobal("cookieStore", undefined);
	});

	it("reads a stored blank as nobody, so the SSR page is not asked for an empty username", async () => {
		await writeUsernameCookie("");

		expect(await readUsernameCookie()).toBeNull();
	});

	it("reads whitespace as nobody too", async () => {
		await writeUsernameCookie("  ");

		expect(await readUsernameCookie()).toBeNull();
	});

	it("round-trips a value that has to be escaped to survive the header", async () => {
		await writeUsernameCookie("a b");

		expect(await readUsernameCookie()).toBe("a b");
	});

	it("reads a value that is not valid percent-encoding as nobody, rather than throwing out of the seed", async () => {
		const stored = vi.spyOn(document, "cookie", "get").mockReturnValue("ck_user=%E0%A4%A");

		expect(await readUsernameCookie()).toBeNull();
		await expect(seedUsernameCookie("torvalds")).resolves.toBeUndefined();
		stored.mockRestore();
		expect(await readUsernameCookie()).toBe("torvalds");
	});

	it("seeds through the fallback once the stored value reads as nobody", async () => {
		await writeUsernameCookie("");

		await seedUsernameCookie("torvalds");

		expect(await readUsernameCookie()).toBe("torvalds");
	});
});

describe("username-cookie when the Cookie Store API refuses", () => {
	it("gives up rather than falling through to the document, which would half-write it", async () => {
		vi.stubGlobal("cookieStore", { set: vi.fn().mockRejectedValue(new Error("denied")) });

		await expect(writeUsernameCookie("gaearon")).resolves.toBeUndefined();

		vi.stubGlobal("cookieStore", undefined);
		expect(await readUsernameCookie()).toBeNull();
	});
});

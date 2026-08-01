// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readUsernameCookie, seedUsernameCookie, writeUsernameCookie } from "./cookie";

describe("username-cookie", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads a trimmed cookie value", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue({ value: " torvalds " }) });
		expect(await readUsernameCookie()).toBe("torvalds");
	});

	it("returns null when the cookie is absent", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockResolvedValue(undefined) });
		expect(await readUsernameCookie()).toBeNull();
	});

	it("returns null when cookieStore throws", async () => {
		vi.stubGlobal("cookieStore", { get: vi.fn().mockRejectedValue(new Error("no")) });
		expect(await readUsernameCookie()).toBeNull();
	});

	it("writes the cookie with a one-week expiry", async () => {
		const set = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("cookieStore", { set });
		await writeUsernameCookie("torvalds");
		expect(set).toHaveBeenCalledWith(expect.objectContaining({ name: "ck_user", value: "torvalds", path: "/" }));
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
		await writeUsernameCookie("torvalds");
		expect(document.cookie).toContain("ck_user=torvalds");
		expect(await readUsernameCookie()).toBe("torvalds");
	});
});

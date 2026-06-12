import { afterEach, describe, expect, it, vi } from "vitest";

describe("getAnalytics", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("returns the same singleton instance", async () => {
		const { getAnalytics } = await import("./analytics");
		expect(getAnalytics()).toBe(getAnalytics());
	});

	it("syncs Google consent to granted and denied", async () => {
		const gtag = vi.fn();
		vi.stubGlobal("window", { gtag });
		const { getAnalytics } = await import("./analytics");

		getAnalytics().syncGoogleConsent(true);
		expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });

		getAnalytics().syncGoogleConsent(false);
		expect(gtag).toHaveBeenLastCalledWith("consent", "update", { analytics_storage: "denied" });
	});

	it("loads Google Analytics only once when an id is set", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST");
		const appendChild = vi.fn();
		vi.stubGlobal("document", { createElement: () => ({ dataset: {} }), head: { appendChild } });
		const { getAnalytics } = await import("./analytics");

		const analytics = getAnalytics();
		analytics.loadGoogleAnalytics();
		analytics.loadGoogleAnalytics();

		expect(appendChild).toHaveBeenCalledTimes(1);
	});

	it("skips Google Analytics when no id is set", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "");
		const appendChild = vi.fn();
		vi.stubGlobal("document", { createElement: () => ({ dataset: {} }), head: { appendChild } });
		const { getAnalytics } = await import("./analytics");

		getAnalytics().loadGoogleAnalytics();

		expect(appendChild).not.toHaveBeenCalled();
	});

	it("loads Better Stack only once when a token is set", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_SOURCE_TOKEN", "tok_123");
		const appendChild = vi.fn();
		vi.stubGlobal("document", { createElement: () => ({ dataset: {} }), head: { appendChild } });
		const { getAnalytics } = await import("./analytics");

		const analytics = getAnalytics();
		analytics.loadBetterStack();
		analytics.loadBetterStack();

		expect(appendChild).toHaveBeenCalledTimes(1);
	});

	it("skips Better Stack when no token is set", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_SOURCE_TOKEN", "");
		const appendChild = vi.fn();
		vi.stubGlobal("document", { createElement: () => ({ dataset: {} }), head: { appendChild } });
		const { getAnalytics } = await import("./analytics");

		getAnalytics().loadBetterStack();

		expect(appendChild).not.toHaveBeenCalled();
	});
});

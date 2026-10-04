import { afterEach, describe, expect, it, vi } from "vitest";

const acceptedService = vi.hoisted(() => vi.fn<(service: string, category: string) => boolean>());

vi.mock("vanilla-cookieconsent", () => ({ acceptedService, acceptedCategory: vi.fn() }));

interface StubbedScript {
	src?: string;
	async?: boolean;
	crossOrigin?: string;
}

const stubDocument = (): { appendChild: ReturnType<typeof vi.fn>; scripts: StubbedScript[] } => {
	const scripts: StubbedScript[] = [];
	const appendChild = vi.fn();
	vi.stubGlobal("document", {
		createElement: () => {
			const script: StubbedScript = {};
			scripts.push(script);
			return script;
		},
		head: { appendChild },
	});
	return { appendChild, scripts };
};

describe("getTelemetry", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("returns the same singleton instance", async () => {
		const { getTelemetry } = await import("./telemetry");
		expect(getTelemetry()).toBe(getTelemetry());
	});

	it("syncs Google consent to granted and denied", async () => {
		const gtag = vi.fn();
		vi.stubGlobal("window", { gtag });
		const { getTelemetry } = await import("./telemetry");

		getTelemetry().syncGoogleConsent(true);
		expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });

		getTelemetry().syncGoogleConsent(false);
		expect(gtag).toHaveBeenLastCalledWith("consent", "update", { analytics_storage: "denied" });
	});

	it("loads Google Analytics only once when an id is set", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST");
		const { appendChild } = stubDocument();
		const { getTelemetry } = await import("./telemetry");

		const telemetry = getTelemetry();
		telemetry.loadGoogleAnalytics();
		telemetry.loadGoogleAnalytics();

		expect(appendChild).toHaveBeenCalledTimes(1);
	});

	it("skips Google Analytics when no id is set", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "");
		const { appendChild } = stubDocument();
		const { getTelemetry } = await import("./telemetry");

		getTelemetry().loadGoogleAnalytics();

		expect(appendChild).not.toHaveBeenCalled();
	});

	it("loads the Better Stack tag from the host its docs name, with the token in the query", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok 123");
		const { scripts } = stubDocument();
		vi.stubGlobal("window", { location: { hostname: "contribkit.app" } });
		const { getTelemetry, BETTER_STACK_TAG_ORIGIN } = await import("./telemetry");

		getTelemetry().loadBetterStack();

		expect(scripts[0].src).toBe(`${BETTER_STACK_TAG_ORIGIN}/b.js?t=tok%20123`);
		expect(scripts[0].async).toBe(true);
		expect(scripts[0].crossOrigin).toBe("anonymous");
	});

	it("loads Better Stack only once when a token is set", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok_123");
		const { appendChild } = stubDocument();
		vi.stubGlobal("window", { location: { hostname: "contribkit.app" } });
		const { getTelemetry } = await import("./telemetry");

		const telemetry = getTelemetry();
		telemetry.loadBetterStack();
		telemetry.loadBetterStack();

		expect(appendChild).toHaveBeenCalledTimes(1);
	});

	it("skips Better Stack when no token is set", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "");
		const { appendChild } = stubDocument();
		const { getTelemetry } = await import("./telemetry");

		getTelemetry().loadBetterStack();

		expect(appendChild).not.toHaveBeenCalled();
	});

	it("queues the environment before the tag has loaded", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok_123");
		stubDocument();
		const window: { location: { hostname: string }; betterstack?: (...args: unknown[]) => void } = {
			location: { hostname: "contribkit.app" },
		};
		vi.stubGlobal("window", window);
		const { getTelemetry } = await import("./telemetry");

		getTelemetry().loadBetterStack();

		const queued = (window.betterstack as unknown as { q: unknown[][] }).q;
		expect(queued).toEqual([["init", { environment: "production" }]]);
	});

	it("does not replace a tag that has already installed itself", async () => {
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok_123");
		stubDocument();
		const betterstack = vi.fn();
		vi.stubGlobal("window", { location: { hostname: "contribkit.app" }, betterstack });
		const { getTelemetry } = await import("./telemetry");

		getTelemetry().loadBetterStack();

		expect(betterstack).toHaveBeenCalledWith("init", { environment: "production" });
	});
});

describe("telemetryEnvironmentFor", () => {
	it("calls the preview Workers and localhost development", async () => {
		const { telemetryEnvironmentFor } = await import("./telemetry");

		expect(telemetryEnvironmentFor("localhost")).toBe("development");
		expect(telemetryEnvironmentFor("127.0.0.1")).toBe("development");
		expect(telemetryEnvironmentFor("pr-12-contribkit-development.fbuireu.workers.dev")).toBe("development");
	});

	it("calls the real domain production", async () => {
		const { telemetryEnvironmentFor } = await import("./telemetry");

		expect(telemetryEnvironmentFor("contribkit.app")).toBe("production");
		expect(telemetryEnvironmentFor("www.contribkit.app")).toBe("production");
	});
});

describe("initTelemetry", () => {
	afterEach(() => {
		acceptedService.mockReset();
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	const stubWindow = (gtag: (...args: unknown[]) => void = vi.fn()) => {
		const addEventListener = vi.fn();
		vi.stubGlobal("window", { addEventListener, gtag, location: { hostname: "contribkit.app" } });
		return { addEventListener };
	};

	it("asks each vendor's own consent service under the analytics category", async () => {
		stubWindow();
		acceptedService.mockReturnValue(false);
		const { initTelemetry } = await import("./telemetry");

		initTelemetry();

		expect(acceptedService).toHaveBeenCalledWith("ga4", "analytics");
		expect(acceptedService).toHaveBeenCalledWith("betterstack", "analytics");
	});

	it("grants and loads Google alone when only Google's service is accepted", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST");
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok_123");
		const { scripts } = stubDocument();
		const gtag = vi.fn();
		stubWindow(gtag);
		acceptedService.mockImplementation((service) => service === "ga4");
		const { initTelemetry } = await import("./telemetry");

		initTelemetry();

		expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });
		expect(scripts.map(({ src }) => src)).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-TEST"]);
	});

	it("keeps Google denied and loads nothing while no service is accepted", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST");
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "tok_123");
		const { appendChild } = stubDocument();
		const gtag = vi.fn();
		stubWindow(gtag);
		acceptedService.mockReturnValue(false);
		const { initTelemetry } = await import("./telemetry");

		initTelemetry();

		expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
		expect(appendChild).not.toHaveBeenCalled();
	});

	it("applies the consent again whenever the banner reports a consent or a change", async () => {
		const { addEventListener } = stubWindow();
		acceptedService.mockReturnValue(false);
		const { initTelemetry } = await import("./telemetry");

		initTelemetry();

		expect(addEventListener.mock.calls.map(([name]) => name)).toEqual(["cc:onConsent", "cc:onChange"]);
	});
});

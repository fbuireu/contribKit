import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordUsageEvent, UsageEventName } from "./usage-event";

const acceptedService = vi.hoisted(() => vi.fn<(service: string, category: string) => boolean>());

vi.mock("vanilla-cookieconsent", () => ({ acceptedService, acceptedCategory: vi.fn() }));

const accept = (services: readonly string[]): void => {
	acceptedService.mockImplementation((service) => services.includes(service));
};

const PALETTE_CHOSEN = { event: UsageEventName.PaletteChosen, properties: { palette: "nord" } } as const;

describe("recordUsageEvent", () => {
	beforeEach(() => {
		acceptedService.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("hands the event and its properties to both vendors when both are accepted", () => {
		const gtag = vi.fn();
		const betterstack = vi.fn();
		vi.stubGlobal("window", { gtag, betterstack });
		accept(["ga4", "betterstack"]);

		recordUsageEvent(PALETTE_CHOSEN);

		expect(gtag).toHaveBeenCalledWith("event", "palette_chosen", { palette: "nord" });
		expect(betterstack).toHaveBeenCalledWith("track", "palette_chosen", { palette: "nord" });
	});

	it("asks consent for each vendor by its service name under the analytics category", () => {
		vi.stubGlobal("window", { gtag: vi.fn(), betterstack: vi.fn() });
		accept([]);

		recordUsageEvent(PALETTE_CHOSEN);

		expect(acceptedService).toHaveBeenCalledWith("ga4", "analytics");
		expect(acceptedService).toHaveBeenCalledWith("betterstack", "analytics");
	});

	it("sends to Google Analytics alone when Better Stack was refused", () => {
		const gtag = vi.fn();
		const betterstack = vi.fn();
		vi.stubGlobal("window", { gtag, betterstack });
		accept(["ga4"]);

		recordUsageEvent({ event: UsageEventName.ThemeChanged, properties: { theme: "dark" } });

		expect(gtag).toHaveBeenCalledWith("event", "theme_changed", { theme: "dark" });
		expect(betterstack).not.toHaveBeenCalled();
	});

	it("sends to Better Stack alone when Google Analytics was refused", () => {
		const gtag = vi.fn();
		const betterstack = vi.fn();
		vi.stubGlobal("window", { gtag, betterstack });
		accept(["betterstack"]);

		recordUsageEvent({ event: UsageEventName.SectionNavigated, properties: { section: "how" } });

		expect(betterstack).toHaveBeenCalledWith("track", "section_navigated", { section: "how" });
		expect(gtag).not.toHaveBeenCalled();
	});

	it("sends nothing when neither vendor was accepted", () => {
		const gtag = vi.fn();
		const betterstack = vi.fn();
		vi.stubGlobal("window", { gtag, betterstack });
		accept([]);

		recordUsageEvent(PALETTE_CHOSEN);

		expect(gtag).not.toHaveBeenCalled();
		expect(betterstack).not.toHaveBeenCalled();
	});

	it("does not throw when the vendor globals are missing", () => {
		vi.stubGlobal("window", {});
		accept(["ga4", "betterstack"]);

		expect(() => recordUsageEvent(PALETTE_CHOSEN)).not.toThrow();
	});

	it("does nothing at all outside a browser", () => {
		vi.stubGlobal("window", undefined);

		recordUsageEvent(PALETTE_CHOSEN);

		expect(acceptedService).not.toHaveBeenCalled();
	});

	it("still reaches the second vendor when the first one throws", () => {
		const betterstack = vi.fn();
		vi.stubGlobal("window", {
			gtag: () => {
				throw new Error("tag not ready");
			},
			betterstack,
		});
		accept(["ga4", "betterstack"]);

		expect(() => recordUsageEvent(PALETTE_CHOSEN)).not.toThrow();
		expect(betterstack).toHaveBeenCalledOnce();
	});

	it("swallows a consent lookup that throws rather than breaking the caller", () => {
		vi.stubGlobal("window", { gtag: vi.fn(), betterstack: vi.fn() });
		acceptedService.mockImplementation(() => {
			throw new Error("consent not initialised");
		});

		expect(() => recordUsageEvent(PALETTE_CHOSEN)).not.toThrow();
	});
});

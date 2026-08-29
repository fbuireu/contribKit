// @vitest-environment happy-dom

import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { Selector } from "@ui/utils/dom-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getActiveExportTab,
	getActivePalette,
	renderCustomize,
	renderExportPreview,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { setDays, setUsername } from "./state";

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const $ = (selector: string) => document.querySelector(selector) as HTMLElement;

import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

const days: ContributionDay[] = Array.from({ length: 371 }, () => day({ date: "2024-06-15", level: 2, count: 4 }));

beforeEach(() => {
	document.body.innerHTML = "";
	setDays(days);
	setUsername("torvalds");
});

describe("setHeroError", () => {
	it("shows then clears the hero error", () => {
		document.body.innerHTML = `<div id="hero-error" hidden></div>`;
		setHeroError("boom");
		expect(byId("hero-error").textContent).toBe("↳ boom");
		expect(byId("hero-error").hidden).toBe(false);
		setHeroError(null);
		expect(byId("hero-error").hidden).toBe(true);
	});
});

describe("updateHeroStats", () => {
	it("writes the totals into the bar and legend", () => {
		document.body.innerHTML = `<span class="bar-tag"></span><div class="legend-stats"></div>`;
		updateHeroStats({ totalContributions: 1234, currentStreak: 5, longestStreak: 9 });
		expect($(".bar-tag").innerHTML).toContain("1,234");
		expect($(".legend-stats").innerHTML).toContain("5");
		expect($(".legend-stats").innerHTML).toContain("9");
	});
});

describe("updateYearRange", () => {
	it("takes the year from the 8th cell", () => {
		document.body.innerHTML = `<span id="hero-year-range"></span>`;
		updateYearRange(days);
		expect(byId("hero-year-range").textContent).toBe("2024");
	});
});

describe("renderCustomize", () => {
	it("renders the grid svg and a palette label", () => {
		document.body.innerHTML = `<div id="custom-grid-container"></div><span id="custom-palette-label"></span>`;
		renderCustomize();
		expect(byId("custom-grid-container").innerHTML).toContain("<svg");
		expect(byId("custom-palette-label").textContent?.length).toBeGreaterThan(0);
	});
});

describe("renderExportPreview", () => {
	it("renders a png card by default", () => {
		document.body.innerHTML = `<div id="export-preview"></div>`;
		renderExportPreview();
		expect(document.querySelector(Selector.ExportPngPreview)).not.toBeNull();
	});

	it("renders a code preview when the svg tab is active", () => {
		document.body.innerHTML = `<div id="export-tabs"><button data-key="svg" aria-selected="true"></button></div><div id="export-preview"></div>`;
		expect(getActiveExportTab()).toBe("svg");
		renderExportPreview();
		expect(document.querySelector("#export-preview .code-preview")).not.toBeNull();
		expect(document.querySelector("#export-preview .copy-btn")).not.toBeNull();
	});
});

describe("getActivePalette", () => {
	const withActiveKey = (key: string) => {
		document.body.innerHTML = `<div id="palette-list"><div class="palette-row active" data-key="${key}"></div></div>`;
	};

	it("reads the key the markup marks active", () => {
		withActiveKey("catppuccin");

		expect(getActivePalette().key).toBe("catppuccin");
		expect(getActivePalette().colors).toEqual(PALETTES.catppuccin.colors);
	});

	it("falls back to the default when no row is active", () => {
		document.body.innerHTML = '<div id="palette-list"></div>';

		expect(getActivePalette().key).toBe(DEFAULT_PALETTE_KEY);
	});

	it("falls back rather than throwing when the markup names a palette that does not exist", () => {
		withActiveKey("not-a-palette");

		expect(() => getActivePalette()).not.toThrow();
		expect(getActivePalette().key).toBe(DEFAULT_PALETTE_KEY);
	});

	it("reports the key it actually used, so the label cannot disagree with the colours", () => {
		withActiveKey("not-a-palette");
		const palette = getActivePalette();

		expect(palette.colors).toEqual(PALETTES[palette.key].colors);
	});
});

describe("the copy button", () => {
	const clickCopy = async (writeText: () => Promise<void>) => {
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		document.body.innerHTML = `<div id="export-tabs"><button data-key="svg" aria-selected="true"></button></div><div id="export-preview"></div>`;
		renderExportPreview();
		const button = document.querySelector<HTMLButtonElement>(Selector.ExportCopyButton);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		return button;
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("says it copied, then goes back to offering to", async () => {
		const button = await clickCopy(async () => {});

		expect(button?.textContent).toBe("copied!");
		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});

	it("says it failed rather than staying silent when the clipboard refuses", async () => {
		const button = await clickCopy(() => Promise.reject(new Error("denied")));

		expect(button?.textContent).toBe("copy failed");
	});

	it("settles back on copy after a second click, never on a stale label", async () => {
		const button = await clickCopy(async () => {});
		expect(button?.textContent).toBe("copied!");

		await vi.advanceTimersByTimeAsync(500);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(button?.textContent).toBe("copied!");

		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});

	it("does not claim success when the second click is the one that failed", async () => {
		let refuse = false;
		const button = await clickCopy(async () => {
			if (refuse) throw new Error("denied");
		});
		expect(button?.textContent).toBe("copied!");

		refuse = true;
		await vi.advanceTimersByTimeAsync(500);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(button?.textContent).toBe("copy failed");

		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});
});

// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
	getActiveExportTab,
	renderCustomize,
	renderExportPreview,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { setCells, setUsername } from "./state";

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const $ = (selector: string) => document.querySelector(selector) as HTMLElement;

import type { ContributionDay } from "@domain/entities/types";

const cells: ContributionDay[] = Array.from({ length: 371 }, () => ({ date: "2024-06-15", level: 2, count: 4 }));

beforeEach(() => {
	document.body.innerHTML = "";
	setCells(cells);
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
		updateHeroStats({ count: 1234, streak: 5, longest: 9 });
		expect($(".bar-tag").innerHTML).toContain("1,234");
		expect($(".legend-stats").innerHTML).toContain("5");
		expect($(".legend-stats").innerHTML).toContain("9");
	});
});

describe("updateYearRange", () => {
	it("takes the year from the 8th cell", () => {
		document.body.innerHTML = `<span id="hero-year-range"></span>`;
		updateYearRange(cells);
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
		expect(document.querySelector("#export-preview .png-preview")).not.toBeNull();
	});

	it("renders a code preview when the svg tab is active", () => {
		document.body.innerHTML = `<div id="export-tabs"><button data-key="svg" aria-selected="true"></button></div><div id="export-preview"></div>`;
		expect(getActiveExportTab()).toBe("svg");
		renderExportPreview();
		expect(document.querySelector("#export-preview .code-preview")).not.toBeNull();
		expect(document.querySelector("#export-preview .copy-btn")).not.toBeNull();
	});
});

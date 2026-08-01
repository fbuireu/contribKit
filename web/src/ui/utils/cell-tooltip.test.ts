// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { initCellTooltip } from "./cell-tooltip";

const UNKNOWN_COUNT_LABEL = /^Contributions unknown on /;

afterEach(() => {
	document.body.innerHTML = "";
});

describe("initCellTooltip", () => {
	it("does nothing when there is no tooltip element", () => {
		expect(() => initCellTooltip()).not.toThrow();
	});

	it("shows the formatted label when hovering a cell", () => {
		document.body.innerHTML = `<div id="cell-tooltip"></div><div id="cell" data-date="2024-03-15" data-count="5"></div>`;
		const tooltip = document.getElementById("cell-tooltip") as HTMLElement;
		const showPopover = vi.fn();
		Object.assign(tooltip, { showPopover, hidePopover: vi.fn(), matches: () => false });
		initCellTooltip();

		const cell = document.getElementById("cell") as HTMLElement;
		cell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

		expect(tooltip.textContent).toContain("March 15, 2024");
		expect(showPopover).toHaveBeenCalled();
	});

	it("still opens on a cell with no data-count and says the count is unknown", () => {
		document.body.innerHTML = `<div id="cell-tooltip"></div><div id="cell" data-date="2024-03-15"></div>`;
		const tooltip = document.getElementById("cell-tooltip") as HTMLElement;
		const showPopover = vi.fn();
		Object.assign(tooltip, { showPopover, hidePopover: vi.fn(), matches: () => false });
		initCellTooltip();

		const cell = document.getElementById("cell") as HTMLElement;
		cell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

		expect(showPopover).toHaveBeenCalled();
		expect(tooltip.textContent).toMatch(UNKNOWN_COUNT_LABEL);
	});
});

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { initCellTooltip } from "./cell-tooltip";

afterEach(() => {
	document.body.innerHTML = "";
});

describe("initCellTooltip", () => {
	it("does nothing when there is no tooltip element", () => {
		expect(() => initCellTooltip()).not.toThrow();
	});

	it("shows the formatted label when hovering a cell", () => {
		document.body.innerHTML = `<div id="cell-tip"></div><div id="cell" data-date="2024-03-15" data-count="5"></div>`;
		const tooltip = document.getElementById("cell-tip") as HTMLElement;
		const showPopover = vi.fn();
		Object.assign(tooltip, { showPopover, hidePopover: vi.fn(), matches: () => false });
		initCellTooltip();

		const cell = document.getElementById("cell") as HTMLElement;
		cell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

		expect(tooltip.textContent).toContain("March 15, 2024");
		expect(showPopover).toHaveBeenCalled();
	});
});

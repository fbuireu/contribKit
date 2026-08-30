// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { initCellTooltip } from "./cell-tooltip";

const UNKNOWN_COUNT_LABEL = /^Contributions unknown on /;

const VIEWPORT_WIDTH = 1000;
const TOOLTIP_WIDTH = 100;
const TOOLTIP_HEIGHT = 40;
const CELL_SIZE = 10;

afterEach(() => {
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

interface TooltipDouble {
	element: HTMLElement;
	showPopover: ReturnType<typeof vi.fn>;
	hidePopover: ReturnType<typeof vi.fn>;
	isOpen: () => boolean;
}

const mountTooltip = (cells = `<div id="cell" data-date="2024-03-15" data-count="5"></div>`): TooltipDouble => {
	document.body.innerHTML = `<div id="cell-tooltip"></div>${cells}`;

	const element = document.getElementById("cell-tooltip") as HTMLElement;
	let open = false;
	const showPopover = vi.fn(() => {
		open = true;
	});
	const hidePopover = vi.fn(() => {
		open = false;
	});

	Object.assign(element, {
		showPopover,
		hidePopover,
		matches: (selector: string) => (selector === ":popover-open" ? open : false),
	});
	element.getBoundingClientRect = () => ({ left: 0, top: 0, width: TOOLTIP_WIDTH, height: TOOLTIP_HEIGHT }) as DOMRect;

	vi.stubGlobal("innerWidth", VIEWPORT_WIDTH);

	return { element, showPopover, hidePopover, isOpen: () => open };
};

interface PlaceParams {
	id?: string;
	left: number;
	top: number;
}

const place = ({ id = "cell", left, top }: PlaceParams) => {
	const cell = document.getElementById(id) as HTMLElement;

	cell.getBoundingClientRect = () =>
		({
			left,
			top,
			right: left + CELL_SIZE,
			bottom: top + CELL_SIZE,
			width: CELL_SIZE,
			height: CELL_SIZE,
		}) as DOMRect;

	return cell;
};

const hover = (element: Element) => element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

describe("initCellTooltip", () => {
	it("does nothing when there is no tooltip element", () => {
		expect(() => initCellTooltip()).not.toThrow();
	});

	it("does nothing where the Popover API is missing, rather than throwing on every hover", () => {
		document.body.innerHTML = `<div id="cell-tooltip"></div><div id="cell" data-date="2024-03-15"></div>`;
		const tooltip = document.getElementById("cell-tooltip") as HTMLElement;
		Object.assign(tooltip, { showPopover: undefined });

		initCellTooltip();

		expect(() => hover(document.getElementById("cell") as HTMLElement)).not.toThrow();
		expect(tooltip.textContent).toBe("");
	});

	it("shows the formatted label when hovering a cell", () => {
		const tooltip = mountTooltip();
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));

		expect(tooltip.element.textContent).toContain("March 15, 2024");
		expect(tooltip.showPopover).toHaveBeenCalled();
	});

	it("still opens on a cell with no data-count and says the count is unknown", () => {
		const tooltip = mountTooltip(`<div id="cell" data-date="2024-03-15"></div>`);
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));

		expect(tooltip.showPopover).toHaveBeenCalled();
		expect(tooltip.element.textContent).toMatch(UNKNOWN_COUNT_LABEL);
	});

	it("opens once for a run of hovers rather than re-showing an open popover", () => {
		const tooltip = mountTooltip();
		initCellTooltip();
		const cell = place({ left: 100, top: 200 });

		hover(cell);
		hover(cell);

		expect(tooltip.showPopover).toHaveBeenCalledOnce();
	});

	it("centres the tooltip over the cell and sits it above", () => {
		const tooltip = mountTooltip();
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));

		expect(tooltip.element.style.left).toBe("55px");
		expect(tooltip.element.style.top).toBe("152px");
	});

	it("drops below the cell when there is no room above it", () => {
		const tooltip = mountTooltip();
		initCellTooltip();

		hover(place({ left: 100, top: 10 }));

		expect(tooltip.element.style.top).toBe("28px");
	});

	it("keeps the tooltip inside the viewport at either edge", () => {
		const tooltip = mountTooltip(
			`<div id="left-cell" data-date="2024-03-15" data-count="1"></div><div id="right-cell" data-date="2024-03-16" data-count="1"></div>`,
		);
		initCellTooltip();

		hover(place({ id: "left-cell", left: 0, top: 200 }));
		expect(tooltip.element.style.left).toBe("8px");

		hover(place({ id: "right-cell", left: 995, top: 200 }));
		expect(tooltip.element.style.left).toBe("892px");
	});

	it("hides once the pointer leaves the cell for something that is not one", () => {
		const tooltip = mountTooltip(
			`<div id="cell" data-date="2024-03-15" data-count="5"></div><p id="elsewhere">text</p>`,
		);
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));
		hover(document.getElementById("elsewhere") as HTMLElement);

		expect(tooltip.hidePopover).toHaveBeenCalled();
	});

	it("does not reach for hidePopover when no cell was ever hovered", () => {
		const tooltip = mountTooltip(`<p id="elsewhere">text</p>`);
		initCellTooltip();

		hover(document.getElementById("elsewhere") as HTMLElement);

		expect(tooltip.hidePopover).not.toHaveBeenCalled();
	});

	it("opens on focus, so the grid is readable by keyboard", () => {
		const tooltip = mountTooltip(`<button id="cell" data-date="2024-03-15" data-count="5"></button>`);
		initCellTooltip();
		place({ left: 100, top: 200 });

		document.getElementById("cell")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

		expect(tooltip.showPopover).toHaveBeenCalled();
		expect(tooltip.element.textContent).toContain("March 15, 2024");
	});

	it("ignores focus landing on something that is not a cell", () => {
		const tooltip = mountTooltip(`<button id="elsewhere"></button>`);
		initCellTooltip();

		document.getElementById("elsewhere")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

		expect(tooltip.showPopover).not.toHaveBeenCalled();
	});

	it("stays open while focus moves from one cell to the next", () => {
		const tooltip = mountTooltip(
			`<button id="cell" data-date="2024-03-15" data-count="5"></button><button id="next" data-date="2024-03-16" data-count="2"></button>`,
		);
		initCellTooltip();
		place({ left: 100, top: 200 });

		document.getElementById("cell")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		document
			.getElementById("cell")
			?.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.getElementById("next") }));

		expect(tooltip.hidePopover).not.toHaveBeenCalled();
	});

	it("closes once focus leaves the grid entirely", () => {
		const tooltip = mountTooltip(`<button id="cell" data-date="2024-03-15" data-count="5"></button>`);
		initCellTooltip();
		place({ left: 100, top: 200 });

		document.getElementById("cell")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		document.getElementById("cell")?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

		expect(tooltip.hidePopover).toHaveBeenCalled();
	});

	it("follows the cell as the page scrolls or the window resizes", () => {
		const tooltip = mountTooltip();
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));
		place({ left: 300, top: 400 });
		globalThis.dispatchEvent(new Event("scroll"));

		expect(tooltip.element.style.left).toBe("255px");

		place({ left: 500, top: 400 });
		globalThis.dispatchEvent(new Event("resize"));

		expect(tooltip.element.style.left).toBe("455px");
	});

	it("repositions nothing once the tooltip is closed", () => {
		const tooltip = mountTooltip(
			`<div id="cell" data-date="2024-03-15" data-count="5"></div><p id="elsewhere">text</p>`,
		);
		initCellTooltip();

		hover(place({ left: 100, top: 200 }));
		hover(document.getElementById("elsewhere") as HTMLElement);
		place({ left: 900, top: 400 });
		globalThis.dispatchEvent(new Event("scroll"));

		expect(tooltip.element.style.left).toBe("55px");
	});
});

import { formatContribLabel } from "@ui/components/grid/contribution";
import { ElementId } from "@ui/utils/dom-contract";

const CELL_GAP = 8;
const VIEWPORT_MARGIN = 8;

export function initCellTooltip(): void {
	const maybeTooltip = document.getElementById(ElementId.CellTooltip);
	if (!maybeTooltip || typeof maybeTooltip.showPopover !== "function") return;
	const tooltip = maybeTooltip;

	let activeCell: Element | null = null;

	function positionTooltip() {
		if (!activeCell) return;
		const cellRect = activeCell.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		let left = cellRect.left + cellRect.width / 2 - tooltipRect.width / 2;
		let top = cellRect.top - tooltipRect.height - CELL_GAP;
		left = Math.max(VIEWPORT_MARGIN, Math.min(left, globalThis.innerWidth - tooltipRect.width - VIEWPORT_MARGIN));
		if (top < VIEWPORT_MARGIN) top = cellRect.bottom + CELL_GAP;
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	function showTooltip(element: HTMLElement | SVGElement) {
		activeCell = element;
		const rawCount = element.dataset.count;
		tooltip.textContent = formatContribLabel({
			dateIso: element.dataset.date || "",
			count: rawCount === undefined ? null : Number.parseInt(rawCount, 10),
		});
		if (!tooltip.matches(":popover-open")) tooltip.showPopover();
		positionTooltip();
	}

	function hideTooltip() {
		activeCell = null;
		if (tooltip.matches(":popover-open")) tooltip.hidePopover();
	}

	document.addEventListener("mouseover", (event) => {
		const cell = event.target instanceof Element ? event.target.closest<HTMLElement | SVGElement>("[data-date]") : null;
		if (cell) showTooltip(cell);
		else if (activeCell) hideTooltip();
	});
	document.addEventListener("focusin", (event) => {
		const cell = event.target instanceof Element ? event.target.closest<HTMLElement | SVGElement>("[data-date]") : null;
		if (cell) showTooltip(cell);
	});
	document.addEventListener("focusout", (event) => {
		const next = event.relatedTarget;
		if (!(next instanceof Element) || !next.closest("[data-date]")) hideTooltip();
	});
	document.addEventListener("mouseleave", hideTooltip);
	globalThis.addEventListener("scroll", positionTooltip, { passive: true });
	globalThis.addEventListener("resize", positionTooltip);
}

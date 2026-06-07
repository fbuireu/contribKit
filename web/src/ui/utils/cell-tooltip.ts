import { formatContribLabel } from "@ui/components/grid/contribution";

export function initCellTooltip(): void {
	const maybeTooltip = document.getElementById("cell-tip");
	if (!maybeTooltip || typeof maybeTooltip.showPopover !== "function") return;
	const tooltip = maybeTooltip;

	let activeCell: Element | null = null;

	function positionTooltip() {
		if (!activeCell) return;
		const cellRect = activeCell.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		let left = cellRect.left + cellRect.width / 2 - tooltipRect.width / 2;
		let top = cellRect.top - tooltipRect.height - 8;
		left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
		if (top < 8) top = cellRect.bottom + 8;
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	function showTooltip(element: Element) {
		activeCell = element;
		tooltip.textContent = formatContribLabel(
			element.getAttribute("data-date") || "",
			parseInt(element.getAttribute("data-count") || "0", 10),
		);
		if (!tooltip.matches(":popover-open")) tooltip.showPopover();
		positionTooltip();
	}

	function hideTooltip() {
		activeCell = null;
		if (tooltip.matches(":popover-open")) tooltip.hidePopover();
	}

	document.addEventListener("mouseover", (event) => {
		const cell = event.target instanceof Element ? event.target.closest("[data-date][data-count]") : null;
		if (cell) showTooltip(cell);
		else if (activeCell) hideTooltip();
	});
	document.addEventListener("focusin", (event) => {
		const cell = event.target instanceof Element ? event.target.closest("[data-date][data-count]") : null;
		if (cell) showTooltip(cell);
	});
	document.addEventListener("focusout", (event) => {
		const next = (event as FocusEvent).relatedTarget;
		if (!(next instanceof Element) || !next.closest("[data-date][data-count]")) hideTooltip();
	});
	document.addEventListener("mouseleave", hideTooltip);
	window.addEventListener("scroll", positionTooltip, { passive: true });
	window.addEventListener("resize", positionTooltip);
}

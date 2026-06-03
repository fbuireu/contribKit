import type { ContributionDay } from "../../domain/entities/contribution-day";
import type { ContributionLevel } from "../../domain/value-objects/contribution-level";

interface ContributionsResponse {
	cells: { date: string; level: ContributionLevel; count: number | null }[];
	total: number;
	error?: string;
}

import { DEFAULT_PALETTE_KEY, PALETTES } from "../../domain/value-objects/palette";
import { DEFAULT_SHAPE_KIND } from "../../domain/value-objects/shape";
import { DEFAULT_USERNAME } from "../../domain/value-objects/username";
import type { Cell, CellSummary } from "./calendar-utils";
import { buildGridFromApi, generateData, rehydrateCells, summarize } from "./calendar-utils";
import { buildCodeBlock, buildMdLines, SVG_LINES } from "./code-preview";
import { formatContribLabel } from "./contribution";
import { CONTRIBUTION_ERRORS } from "./contribution-errors";
import { generateMiniGrid } from "./mini-grid";
import { renderCalendarString } from "./render-svg";

const CELLS =
	Array.isArray(window.__INITIAL_CELLS__) && window.__INITIAL_CELLS__.length
		? rehydrateCells(window.__INITIAL_CELLS__)
		: generateData(7);

const ERRORS = CONTRIBUTION_ERRORS;

const CURRENT_YEAR = new Date().getFullYear();

function readUsernameFromUrl(): string {
	return new URLSearchParams(window.location.search).get("user")?.trim() || DEFAULT_USERNAME;
}

function syncUrl(username: string, year: number) {
	const url = new URL(window.location.href);
	if (username && username !== DEFAULT_USERNAME) url.searchParams.set("user", username);
	else url.searchParams.delete("user");
	if (year && year !== CURRENT_YEAR) url.searchParams.set("year", String(year));
	else url.searchParams.delete("year");
	window.history.replaceState(null, "", url);
}

let liveCells = CELLS;
let liveUsername = readUsernameFromUrl();

const getActivePalette = () =>
	document.querySelector<HTMLElement>("#palette-list .palette-row.active")?.dataset.key ?? DEFAULT_PALETTE_KEY;

const getActiveShape = () =>
	document.querySelector<HTMLElement>("#shape-list .shape-btn.active")?.dataset.key ?? DEFAULT_SHAPE_KIND;

const getActiveExportTab = () =>
	document.querySelector<HTMLElement>('#export-tabs [aria-selected="true"]')?.dataset.key ?? "png";

function renderWidget() {
	const palette = PALETTES[getActivePalette()].colors;
	const phoneScreen = document.getElementById("phone-screen");
	if (phoneScreen) phoneScreen.style.setProperty("--wp-peak", palette[4]);
	const widgetGrid = document.getElementById("widget-mini-grid");
	if (widgetGrid) widgetGrid.innerHTML = generateMiniGrid(palette, liveCells);
	const widgetUsername = document.getElementById("widget-username");
	if (widgetUsername && liveUsername) widgetUsername.textContent = liveUsername;
}

function renderCustomize() {
	const palette = PALETTES[getActivePalette()].colors;
	const shape = getActiveShape();
	const customGrid = document.getElementById("custom-grid-container");
	if (customGrid)
		customGrid.innerHTML = renderCalendarString({
			cells: liveCells,
			palette,
			shape,
			size: 12,
			gap: 3,
			showLabels: false,
		});
	const heroGrid = document.getElementById("hero-grid-container");
	if (heroGrid)
		heroGrid.innerHTML = renderCalendarString({ cells: liveCells, palette, shape, size: 13, gap: 3, showLabels: true });
	document.querySelectorAll<HTMLElement>(".legend .legend-sq").forEach((square, i) => {
		square.style.background = palette[i] ?? palette[0];
	});
	const paletteLabelEl = document.getElementById("custom-palette-label");
	if (paletteLabelEl) paletteLabelEl.textContent = getActivePalette();
	const shapeLabelEl = document.getElementById("custom-shape-label");
	if (shapeLabelEl) shapeLabelEl.textContent = shape;
	renderExportPreview();
	renderWidget();
}

function renderExportPreview() {
	const preview = document.getElementById("export-preview");
	if (!preview) return;
	preview.innerHTML = "";
	const card = document.createElement("div");
	card.className = "preview-card";
	const palette = PALETTES[getActivePalette()].colors;
	const shape = getActiveShape();
	const exportTab = getActiveExportTab();

	if (exportTab === "png") {
		card.classList.add("png-preview");
		const checker = document.createElement("div");
		checker.className = "preview-checker";
		checker.setAttribute("aria-hidden", "true");
		card.appendChild(checker);
		const content = document.createElement("div");
		content.className = "preview-content";
		content.innerHTML = renderCalendarString({ cells: liveCells, palette, shape, size: 10, gap: 2, showLabels: false });
		card.appendChild(content);
		const tag = document.createElement("div");
		tag.className = "preview-tag mono";
		tag.textContent = `${liveUsername}.png`;
		card.appendChild(tag);
	} else {
		card.classList.add("code-preview");
		const mdLines = buildMdLines(liveUsername, getActivePalette(), shape);
		card.appendChild(buildCodeBlock(exportTab === "svg" ? SVG_LINES : mdLines));
		const plainText =
			exportTab === "svg"
				? renderCalendarString({ cells: liveCells, palette, shape, size: 10, gap: 2, showLabels: false })
				: `![contributions](https://contribkit.app/user/${liveUsername}.svg)`;
		const copyButton = document.createElement("button");
		copyButton.className = "copy-btn mono";
		copyButton.textContent = "copy";
		copyButton.addEventListener("click", () => {
			navigator.clipboard.writeText(plainText).then(() => {
				copyButton.textContent = "copied!";
				setTimeout(() => {
					copyButton.textContent = "copy";
				}, 1500);
			});
		});
		card.appendChild(copyButton);
		const tag = document.createElement("div");
		tag.className = "preview-tag mono";
		tag.textContent = exportTab === "svg" ? `${liveUsername}.svg` : "README.md";
		card.appendChild(tag);
	}
	preview.appendChild(card);
}

function updateYearRange(cells: Cell[]) {
	const el = document.getElementById("hero-year-range");
	if (!el || cells.length < 8) return;
	// cells[0] may be late December of the previous year; cells[7] is always in the target year
	el.textContent = cells[7].date.slice(0, 4);
}

function updateHeroStats(summary: CellSummary) {
	const bar = document.querySelector(".bar-tag");
	if (bar)
		bar.innerHTML = `<span class="mono" style="color:var(--contrib-peak)">${summary.count.toLocaleString()}</span> contributions`;
	const stats = document.querySelector(".legend-stats");
	if (stats)
		stats.innerHTML = `<span><b class="mono">${summary.streak}</b> day streak</span><span class="sep">·</span><span><b class="mono">${summary.longest}</b> longest</span>`;
}

function setHeroError(message: string | null) {
	const errorEl = document.getElementById("hero-error");
	if (!errorEl) return;
	if (message) {
		errorEl.textContent = `↳ ${message}`;
		errorEl.hidden = false;
	} else {
		errorEl.textContent = "";
		errorEl.hidden = true;
	}
}

async function renderFromGitHub(username: string) {
	const renderButton = document.getElementById("hero-render-btn") as HTMLButtonElement | null;
	const renderLabel = document.getElementById("hero-render-label");
	const gridContainer = document.getElementById("hero-grid-container");
	const usernameDisplay = document.getElementById("hero-username-display");
	const yearSelect = document.getElementById("hero-year") as HTMLSelectElement | null;
	if (!renderButton || !gridContainer) return;

	const selectedYear = Number(yearSelect?.value ?? 0);
	const yearQuery = selectedYear && selectedYear <= CURRENT_YEAR ? `&year=${selectedYear}` : "";

	syncUrl(username, selectedYear);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await fetch(`/api/contributions?user=${encodeURIComponent(username)}${yearQuery}`);
		const data = (await response.json()) as ContributionsResponse;

		if (!response.ok) {
			setHeroError(ERRORS[response.status] ?? data.error ?? "something went wrong");
			liveCells = buildGridFromApi([], selectedYear || new Date().getFullYear());
			liveUsername = username;
			renderCustomize();
			updateHeroStats({ count: 0, streak: 0, longest: 0 });
		} else {
			const year = parseInt(data.cells[0]?.date ?? String(new Date().getFullYear()), 10);
			liveCells = buildGridFromApi(data.cells, year);
			liveUsername = username;
			renderCustomize();
			if (usernameDisplay) usernameDisplay.textContent = username;
			const stats = summarize(
				data.cells.map((cell: ContributionDay) => ({
					date: cell.date,
					level: cell.level,
					count: cell.count ?? null,
				})),
			);
			if (data.total != null) stats.count = data.total;
			updateHeroStats(stats);
			updateYearRange(liveCells);
			renderExportPreview();
			const howWidget = document.getElementById("how-widget-username");
			if (howWidget) howWidget.textContent = username;
		}
	} catch {
		setHeroError("could not reach the server, try again");
		liveCells = buildGridFromApi([], selectedYear || new Date().getFullYear());
		liveUsername = username;
		renderCustomize();
		updateHeroStats({ count: 0, streak: 0, longest: 0 });
	}

	renderButton.disabled = false;
	if (renderLabel) renderLabel.textContent = "render";
}

function activateRadio(buttons: NodeListOf<HTMLElement>, target: HTMLElement) {
	buttons.forEach((b) => {
		b.classList.remove("active");
		b.setAttribute("aria-checked", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-checked", "true");
}

function addRadioKeyboard(buttons: NodeListOf<HTMLElement>, index: number, onActivate: () => void) {
	const btn = buttons[index];
	btn.addEventListener("keydown", (event) => {
		const len = buttons.length;
		let targetIndex = -1;
		if (event.key === "ArrowDown" || event.key === "ArrowRight") {
			event.preventDefault();
			targetIndex = (index + 1) % len;
		} else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
			event.preventDefault();
			targetIndex = (index - 1 + len) % len;
		} else if (event.key === "Home") {
			event.preventDefault();
			targetIndex = 0;
		} else if (event.key === "End") {
			event.preventDefault();
			targetIndex = len - 1;
		}
		if (targetIndex < 0) return;
		activateRadio(buttons, buttons[targetIndex]);
		buttons[targetIndex].focus();
		onActivate();
	});
}

function initPaletteList() {
	const allPaletteButtons = document.querySelectorAll<HTMLElement>("#palette-list .palette-row");
	allPaletteButtons.forEach((button, index) => {
		button.addEventListener("click", () => {
			activateRadio(allPaletteButtons, button);
			renderCustomize();
		});
		addRadioKeyboard(allPaletteButtons, index, renderCustomize);
	});
}

function initShapeList() {
	const allShapeButtons = document.querySelectorAll<HTMLElement>("#shape-list .shape-btn");
	allShapeButtons.forEach((button, index) => {
		button.addEventListener("click", () => {
			activateRadio(allShapeButtons, button);
			renderCustomize();
		});
		addRadioKeyboard(allShapeButtons, index, renderCustomize);
	});
}

function activateTab(tabs: NodeListOf<HTMLElement>, target: HTMLElement) {
	tabs.forEach((t) => {
		t.classList.remove("active");
		t.setAttribute("aria-selected", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-selected", "true");
	const panel = document.getElementById("export-preview");
	if (panel && target.id) panel.setAttribute("aria-labelledby", target.id);
}

function initExportTabs() {
	const allTabs = document.querySelectorAll<HTMLElement>("#export-tabs [data-key]");
	allTabs.forEach((tab, index) => {
		tab.addEventListener("click", () => {
			activateTab(allTabs, tab);
			renderExportPreview();
		});
		tab.addEventListener("keydown", (event) => {
			const len = allTabs.length;
			let targetIndex = -1;
			if (event.key === "ArrowRight") {
				event.preventDefault();
				targetIndex = (index + 1) % len;
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				targetIndex = (index - 1 + len) % len;
			} else if (event.key === "Home") {
				event.preventDefault();
				targetIndex = 0;
			} else if (event.key === "End") {
				event.preventDefault();
				targetIndex = len - 1;
			}
			if (targetIndex < 0) return;
			activateTab(allTabs, allTabs[targetIndex]);
			allTabs[targetIndex].focus();
			renderExportPreview();
		});
	});
}

function initUsernameStrip() {
	const form = document.getElementById("username-form") as HTMLFormElement | null;
	const input = document.getElementById("hero-username") as HTMLInputElement | null;
	const renderButton = document.getElementById("hero-render-btn") as HTMLButtonElement | null;
	const usernameDisplay = document.getElementById("hero-username-display");
	if (!input || !renderButton || !usernameDisplay) return;

	form?.addEventListener("submit", (event) => {
		event.preventDefault();
		renderFromGitHub(input.value.trim() || DEFAULT_USERNAME);
	});
	input.addEventListener("input", () => {
		usernameDisplay.textContent = input.value.trim() || DEFAULT_USERNAME;
	});
	renderButton.addEventListener("click", () => {
		renderFromGitHub(input.value.trim() || DEFAULT_USERNAME);
	});
	document.querySelectorAll<HTMLElement>(".sug-btn").forEach((button) => {
		button.addEventListener("click", () => {
			const username = button.dataset.username;
			if (!username) return;
			input.value = username;
			usernameDisplay.textContent = username;
			renderFromGitHub(username);
		});
	});
}

function initCellTooltip() {
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

export function initPage() {
	renderCustomize();
	renderWidget();
	renderExportPreview();
	initPaletteList();
	initShapeList();
	initExportTabs();
	initUsernameStrip();
	updateYearRange(CELLS);
	initCellTooltip();
}

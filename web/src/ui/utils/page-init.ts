import type { ContributionDay } from "@domain/entities/types";
import type { ContributionLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_USERNAME } from "@domain/value-objects/username";
import { buildGridFromApi, generateData, rehydrateCells, summarize } from "@ui/components/grid/calendar-utils";
import { CONTRIBUTION_ERRORS } from "@ui/utils/contribution-errors";
import { initCellTooltip } from "./cell-tooltip";
import { seedUsernameCookie, writeUsernameCookie } from "./cookie";
import { getCells, setCells, setUsername } from "./home-state";
import {
	renderCustomize,
	renderExportPreview,
	renderWidget,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { activateRadio, activateTab, addRadioKeyboard } from "./roving";
import { readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

interface ContributionsResponse {
	cells: { date: string; level: ContributionLevel; count: number | null }[];
	total: number;
	error?: string;
}

const CELLS =
	Array.isArray(window.__INITIAL_CELLS__) && window.__INITIAL_CELLS__.length
		? rehydrateCells(window.__INITIAL_CELLS__)
		: generateData(7);

const ERRORS = CONTRIBUTION_ERRORS;
const CURRENT_YEAR = new Date().getFullYear();

setCells(CELLS);
setUsername(readUsernameFromUrl(DEFAULT_USERNAME));

async function renderFromGitHub(username: string, { updateHistory = true }: { updateHistory?: boolean } = {}) {
	const renderButton = document.getElementById("hero-render-btn") as HTMLButtonElement | null;
	const renderLabel = document.getElementById("hero-render-label");
	const gridContainer = document.getElementById("hero-grid-container");
	const usernameDisplay = document.getElementById("hero-username-display");
	const yearSelect = document.getElementById("hero-year") as HTMLSelectElement | null;
	if (!renderButton || !gridContainer) return;

	const selectedYear = Number(yearSelect?.value ?? 0);
	const yearQuery = selectedYear && selectedYear <= CURRENT_YEAR ? `&year=${selectedYear}` : "";

	if (updateHistory) syncUrl(username, selectedYear, CURRENT_YEAR);
	void writeUsernameCookie(username);
	syncSuggestionSelection(username);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await fetch(`/api/contributions?user=${encodeURIComponent(username)}${yearQuery}`);
		const data = (await response.json()) as ContributionsResponse;

		if (!response.ok) {
			setHeroError(ERRORS[response.status] ?? data.error ?? "something went wrong");
			setCells(buildGridFromApi([], selectedYear || new Date().getFullYear()));
			setUsername(username);
			renderCustomize();
			updateHeroStats({ count: 0, streak: 0, longest: 0 });
		} else {
			const year = parseInt(data.cells[0]?.date ?? String(new Date().getFullYear()), 10);
			setCells(buildGridFromApi(data.cells, year));
			setUsername(username);
			renderCustomize();
			if (usernameDisplay) usernameDisplay.textContent = username;
			const stats = summarize(
				data.cells.map((cell: ContributionDay) => ({ date: cell.date, level: cell.level, count: cell.count ?? null })),
			);
			if (data.total != null) stats.count = data.total;
			updateHeroStats(stats);
			updateYearRange(getCells());
			renderExportPreview();
			const howWidget = document.getElementById("how-widget-username");
			if (howWidget) howWidget.textContent = username;
		}
	} catch {
		setHeroError("could not reach the server, try again");
		setCells(buildGridFromApi([], selectedYear || new Date().getFullYear()));
		setUsername(username);
		renderCustomize();
		updateHeroStats({ count: 0, streak: 0, longest: 0 });
	}

	renderButton.disabled = false;
	if (renderLabel) renderLabel.textContent = "render";
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

function syncSuggestionSelection(username?: string) {
	const input = document.getElementById("hero-username") as HTMLInputElement | null;
	const normalized = (username ?? input?.value ?? "").trim().toLowerCase();
	document.querySelectorAll<HTMLElement>(".sug-btn").forEach((button) => {
		const isMatch = !!normalized && button.dataset.username === normalized;
		button.classList.toggle("selected", isMatch);
		button.setAttribute("aria-pressed", String(isMatch));
	});
}

function initUsernameStrip() {
	const form = document.getElementById("username-form") as HTMLFormElement | null;
	const input = document.getElementById("hero-username") as HTMLInputElement | null;
	const renderButton = document.getElementById("hero-render-btn") as HTMLButtonElement | null;
	const usernameDisplay = document.getElementById("hero-username-display");
	if (!input || !renderButton || !usernameDisplay) return;

	const submitRender = () => {
		const username = input.value.trim().toLowerCase();
		if (!username) {
			setHeroError("enter a GitHub username");
			input.focus();
			return;
		}
		renderFromGitHub(username);
	};

	form?.addEventListener("submit", (event) => {
		event.preventDefault();
		submitRender();
	});
	input.addEventListener("input", () => {
		const lowered = input.value.toLowerCase();
		if (lowered !== input.value) {
			const caret = input.selectionStart;
			input.value = lowered;
			if (caret !== null) input.setSelectionRange(caret, caret);
		}
		const value = lowered.trim();
		usernameDisplay.textContent = value || "username";
		syncSuggestionSelection(value);
		if (value) setHeroError(null);
	});
	renderButton.addEventListener("click", submitRender);
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

function initHistoryNav() {
	window.addEventListener("popstate", () => {
		const username = readUsernameFromUrl(DEFAULT_USERNAME);
		const input = document.getElementById("hero-username") as HTMLInputElement | null;
		const yearSelect = document.getElementById("hero-year") as HTMLSelectElement | null;
		const usernameDisplay = document.getElementById("hero-username-display");
		if (input) input.value = username;
		if (usernameDisplay) usernameDisplay.textContent = username;
		if (yearSelect) yearSelect.value = String(readYearFromUrl(CURRENT_YEAR));
		renderFromGitHub(username, { updateHistory: false });
	});
}

function initUsernameState() {
	const input = document.getElementById("hero-username") as HTMLInputElement | null;
	const ssrUsername = input?.value.trim() || DEFAULT_USERNAME;
	setUsername(ssrUsername);

	const urlUser = new URLSearchParams(window.location.search).get("user")?.trim();
	if (!urlUser) void seedUsernameCookie(ssrUsername);

	if (urlUser !== ssrUsername) {
		const url = new URL(window.location.href);
		url.searchParams.set("user", ssrUsername);
		window.history.replaceState(null, "", url);
	}

	syncSuggestionSelection(ssrUsername);
}

export function initPage() {
	initUsernameState();
	renderCustomize();
	renderWidget();
	renderExportPreview();
	initPaletteList();
	initShapeList();
	initExportTabs();
	initUsernameStrip();
	initHistoryNav();
	updateYearRange(CELLS);
	initCellTooltip();
}

import { buildGridFromApi } from "@domain/services/calendar-grid";
import type { ContributionLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_USERNAME } from "@domain/value-objects/username";
import { generateData, summarize } from "@ui/components/grid/calendar";
import { CONTRIBUTION_ERRORS, FALLBACK_CONTRIBUTION_ERROR } from "@ui/utils/contribution-errors";
import { initCellTooltip } from "./cell-tooltip";
import { seedUsernameCookie, writeUsernameCookie } from "./cookie";
import {
	renderCustomize,
	renderExportPreview,
	renderWidget,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { activateRadio, activateTab, initRovingGroup, RovingOrientation } from "./roving";
import { getCells, setCells, setUsername } from "./state";
import { readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

interface ContributionsResponse {
	cells: { date: string; level: ContributionLevel; count: number | null }[];
	total: number;
	error?: string;
}

const CELLS =
	Array.isArray(window.__INITIAL_CELLS__) && window.__INITIAL_CELLS__.length
		? window.__INITIAL_CELLS__
		: generateData();

const CURRENT_YEAR = new Date().getFullYear();

setCells(CELLS);
setUsername(readUsernameFromUrl(DEFAULT_USERNAME));

interface ShowErrorStateParams {
	message: string;
	year: number;
}

function showErrorState({ message, year }: ShowErrorStateParams): void {
	setHeroError(message);
	setCells(buildGridFromApi({ days: [], year }));
	renderCustomize();
	updateHeroStats({ count: 0, streak: 0, longest: 0 });
}

async function renderFromGitHub(username: string, { updateHistory = true }: { updateHistory?: boolean } = {}) {
	const renderButton = document.getElementById("hero-render-btn") as HTMLButtonElement | null;
	const renderLabel = document.getElementById("hero-render-label");
	const gridContainer = document.getElementById("hero-grid-container");
	const usernameDisplay = document.getElementById("hero-username-display");
	const yearSelect = document.getElementById("hero-year") as HTMLSelectElement | null;
	if (!renderButton || !gridContainer) return;

	const selectedYear = Number(yearSelect?.value ?? 0);
	const yearQuery = selectedYear && selectedYear <= CURRENT_YEAR ? `&year=${selectedYear}` : "";
	const fallbackYear = selectedYear || CURRENT_YEAR;

	if (updateHistory) syncUrl({ username, year: selectedYear, currentYear: CURRENT_YEAR });
	void writeUsernameCookie(username);
	syncSuggestionSelection(username);
	setUsername(username);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await fetch(`/api/contributions?user=${encodeURIComponent(username)}${yearQuery}`);
		const data: ContributionsResponse = await response.json();

		if (!response.ok) {
			showErrorState({
				message: CONTRIBUTION_ERRORS[response.status] ?? data.error ?? FALLBACK_CONTRIBUTION_ERROR,
				year: fallbackYear,
			});
		} else {
			const firstDate = data.cells[0]?.date;
			const year = firstDate ? Number(firstDate.slice(0, 4)) : CURRENT_YEAR;
			setCells(buildGridFromApi({ days: data.cells, year }));
			renderCustomize();
			if (usernameDisplay) usernameDisplay.textContent = username;
			const stats = summarize(data.cells);
			if (data.total != null) stats.count = data.total;
			updateHeroStats(stats);
			updateYearRange(getCells());
			renderExportPreview();
			const howWidget = document.getElementById("how-widget-username");
			if (howWidget) howWidget.textContent = username;
		}
	} catch {
		showErrorState({ message: "could not reach the server, try again", year: fallbackYear });
	}

	renderButton.disabled = false;
	if (renderLabel) renderLabel.textContent = "render";
}

function initRadioList(selector: string) {
	const buttons = document.querySelectorAll<HTMLElement>(selector);
	initRovingGroup({
		elements: buttons,
		activate: (target) => activateRadio({ buttons, target }),
		onActivate: renderCustomize,
	});
}

function initExportTabs() {
	const tabs = document.querySelectorAll<HTMLElement>("#export-tabs [data-key]");
	initRovingGroup({
		elements: tabs,
		activate: (target) => activateTab({ tabs, target }),
		onActivate: renderExportPreview,
		orientation: RovingOrientation.Horizontal,
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
	globalThis.addEventListener("popstate", () => {
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

	const urlUser = new URLSearchParams(globalThis.location.search).get("user")?.trim();
	if (!urlUser) void seedUsernameCookie(ssrUsername);

	if (urlUser !== ssrUsername) {
		const url = new URL(globalThis.location.href);
		url.searchParams.set("user", ssrUsername);
		globalThis.history.replaceState(null, "", url);
	}

	syncSuggestionSelection(ssrUsername);
}

export function initPage() {
	initUsernameState();
	renderCustomize();
	renderWidget();
	renderExportPreview();
	initRadioList("#palette-list .palette-row");
	initRadioList("#shape-list .shape-btn");
	initExportTabs();
	initUsernameStrip();
	initHistoryNav();
	updateYearRange(CELLS);
	initCellTooltip();
}

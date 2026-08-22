import type { ContributionDay } from "@domain/entities/types";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { statsWithScrapedTotal } from "@domain/services/contribution-stats";
import type { ContributionLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_USERNAME } from "@domain/value-objects/username";
import { generateData } from "@ui/components/grid/calendar";
import { contributionError } from "@ui/utils/contribution-errors";
import { ClassName, ElementId, Selector } from "@ui/utils/dom-contract";
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
import { getDays, setDays, setUsername } from "./state";
import { readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

interface ContributionsResponse {
	days: { date: string; level: ContributionLevel; count: number | null }[];
	total: number | null;
	error?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const initialDays = (): ContributionDay[] =>
	Array.isArray(window.__INITIAL_DAYS__) && window.__INITIAL_DAYS__.length ? window.__INITIAL_DAYS__ : generateData();

export type ContributionsRequest = (url: string) => Promise<Response>;

const sendRequest: ContributionsRequest = (url) => fetch(url);

interface ShowErrorStateParams {
	message: string;
	year: number;
}

function showErrorState({ message, year }: ShowErrorStateParams): void {
	setHeroError(message);
	setDays(buildGridFromApi({ days: [], year }));
	renderCustomize();
	updateHeroStats({ totalContributions: null, currentStreak: 0, longestStreak: 0 });
}

export interface RenderFromGitHubParams {
	username: string;
	updateHistory?: boolean;
	request?: ContributionsRequest;
}

export async function renderFromGitHub({
	username,
	updateHistory = true,
	request = sendRequest,
}: RenderFromGitHubParams) {
	const renderButton = document.getElementById(ElementId.HeroRenderButton) as HTMLButtonElement | null;
	const renderLabel = document.getElementById(ElementId.HeroRenderLabel);
	const gridContainer = document.getElementById(ElementId.HeroGrid);
	const usernameDisplay = document.getElementById(ElementId.HeroUsernameDisplay);
	const yearSelect = document.getElementById(ElementId.HeroYear) as HTMLSelectElement | null;
	if (!renderButton || !gridContainer) return;

	const selectedYear = Number(yearSelect?.value ?? 0);
	const year = selectedYear && selectedYear <= CURRENT_YEAR ? selectedYear : CURRENT_YEAR;

	if (updateHistory) syncUrl({ username, year: selectedYear, currentYear: CURRENT_YEAR });
	syncSuggestionSelection(username);
	setUsername(username);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await request(`/api/contributions?user=${encodeURIComponent(username)}&year=${year}`);
		const data: ContributionsResponse = await response.json();

		if (!response.ok) {
			showErrorState({
				message: contributionError({ status: response.status, serverMessage: data.error }),
				year,
			});
		} else {
			void writeUsernameCookie(username);
			setDays(buildGridFromApi({ days: data.days, year }));
			renderCustomize();
			if (usernameDisplay) usernameDisplay.textContent = username;
			const stats = statsWithScrapedTotal({ days: data.days, scrapedTotal: data.total });
			updateHeroStats(stats);
			updateYearRange(getDays());
			renderExportPreview();
			const howWidget = document.getElementById(ElementId.HowItWorksUsername);
			if (howWidget) howWidget.textContent = username;
		}
	} catch {
		showErrorState({ message: "could not reach the server, try again", year });
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
	const tabs = document.querySelectorAll<HTMLElement>(Selector.ExportTabKeys);
	initRovingGroup({
		elements: tabs,
		activate: (target) => activateTab({ tabs, target }),
		onActivate: renderExportPreview,
		orientation: RovingOrientation.Horizontal,
	});
}

function syncSuggestionSelection(username?: string) {
	const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
	const normalized = (username ?? input?.value ?? "").trim().toLowerCase();
	document.querySelectorAll<HTMLElement>(Selector.SuggestionButtons).forEach((button) => {
		const isMatch = !!normalized && button.dataset.username === normalized;
		button.classList.toggle(ClassName.Selected, isMatch);
		button.setAttribute("aria-pressed", String(isMatch));
	});
}

function initUsernameStrip() {
	const form = document.getElementById(ElementId.UsernameForm) as HTMLFormElement | null;
	const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
	const renderButton = document.getElementById(ElementId.HeroRenderButton) as HTMLButtonElement | null;
	const usernameDisplay = document.getElementById(ElementId.HeroUsernameDisplay);
	if (!input || !renderButton || !usernameDisplay) return;

	const submitRender = () => {
		const username = input.value.trim().toLowerCase();
		if (!username) {
			setHeroError("enter a GitHub username");
			input.focus();
			return;
		}
		renderFromGitHub({ username });
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
	document.querySelectorAll<HTMLElement>(Selector.SuggestionButtons).forEach((button) => {
		button.addEventListener("click", () => {
			const username = button.dataset.username;
			if (!username) return;
			input.value = username;
			usernameDisplay.textContent = username;
			renderFromGitHub({ username });
		});
	});
}

function initHistoryNav() {
	globalThis.addEventListener("popstate", () => {
		const username = readUsernameFromUrl(DEFAULT_USERNAME);
		const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
		const yearSelect = document.getElementById(ElementId.HeroYear) as HTMLSelectElement | null;
		const usernameDisplay = document.getElementById(ElementId.HeroUsernameDisplay);
		if (input) input.value = username;
		if (usernameDisplay) usernameDisplay.textContent = username;
		if (yearSelect) yearSelect.value = String(readYearFromUrl(CURRENT_YEAR));
		renderFromGitHub({ username, updateHistory: false });
	});
}

function initUsernameState() {
	const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
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
	const days = initialDays();
	setDays(days);
	setUsername(readUsernameFromUrl(DEFAULT_USERNAME));

	initUsernameState();
	renderCustomize();
	renderWidget();
	renderExportPreview();
	initRadioList(Selector.PaletteRows);
	initRadioList(Selector.ShapeButtons);
	initExportTabs();
	initUsernameStrip();
	initHistoryNav();
	updateYearRange(days);
	initCellTooltip();
}

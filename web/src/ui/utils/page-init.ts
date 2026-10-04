import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { statsWithScrapedTotal, UNKNOWN_CONTRIBUTION_STATS } from "@domain/services/contribution-stats";
import { toIsoDate } from "@domain/services/dates";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { resolveYear } from "@domain/value-objects/year";
import {
	CalendarFailureReason,
	CalendarRequestSource,
	recordUsageEvent,
	UsageEventName,
} from "../components/core/telemetry/usage-event";
import { generateData } from "../components/grid/calendar";
import { initCellTooltip } from "./cell-tooltip";
import { contributionError, contributionFailureReason } from "./contribution-errors";
import {
	contributionCalendarErrorSchema,
	contributionCalendarSchema,
	contributionGridSchema,
	toContributionDays,
} from "./contributions-body";
import { seedUsernameCookie, writeUsernameCookie } from "./cookie";
import { ClassName, ElementId, Selector } from "./dom-contract";
import {
	getActiveExportTab,
	getActivePalette,
	getActiveShape,
	renderCustomize,
	renderExportPreview,
	renderWidget,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { activateRadio, activateTab, initRovingGroup, RovingOrientation } from "./roving";
import { getDays, setDays, setUsername } from "./state";
import { readRequestedUsername, readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

const CURRENT_YEAR = new Date().getFullYear();

const initialDays = (): ContributionDay[] => {
	const injected = window.__INITIAL_DAYS__;
	return contributionGridSchema.validate(injected) ? toContributionDays(injected) : generateData();
};

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
	updateHeroStats(UNKNOWN_CONTRIBUTION_STATS);
}

export interface RenderFromGitHubParams {
	username: string;
	updateHistory?: boolean;
	request?: ContributionsRequest;
	source?: CalendarRequestSource;
}

export async function renderFromGitHub({
	username,
	updateHistory = true,
	request = sendRequest,
	source = CalendarRequestSource.Form,
}: RenderFromGitHubParams) {
	const renderButton = document.getElementById(ElementId.HeroRenderButton) as HTMLButtonElement | null;
	const renderLabel = document.getElementById(ElementId.HeroRenderLabel);
	const gridContainer = document.getElementById(ElementId.HeroGrid);
	const usernameDisplay = document.getElementById(ElementId.HeroUsernameDisplay);
	const yearSelect = document.getElementById(ElementId.HeroYear) as HTMLSelectElement | null;
	if (!renderButton || !gridContainer) return;

	const year = resolveYear({ requested: yearSelect?.value, thisYear: CURRENT_YEAR });

	if (updateHistory) syncUrl({ username, year, currentYear: CURRENT_YEAR });
	syncSuggestionSelection(username);
	setUsername(username);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await request(`/api/contributions?user=${encodeURIComponent(username)}&year=${year}`);
		const body: unknown = await response.json().catch(() => null);

		if (!response.ok || !contributionCalendarSchema.validate(body)) {
			const failure = contributionCalendarErrorSchema.validate(body) ? body : null;
			showErrorState({
				message: contributionError({
					status: response.status,
					kind: failure?.kind,
					field: failure?.field,
					serverMessage: failure?.error,
				}),
				year,
			});
			recordUsageEvent({
				event: UsageEventName.CalendarRenderFailed,
				properties: { reason: contributionFailureReason(response.status), year },
			});
		} else {
			void writeUsernameCookie(username);
			const days = toContributionDays(body.days);
			setDays(buildGridFromApi({ days, year }));
			renderCustomize();
			if (usernameDisplay) usernameDisplay.textContent = username;
			const stats = statsWithScrapedTotal({
				days,
				year,
				today: toIsoDate(new Date()),
				scrapedTotal: body.total,
			});
			updateHeroStats(stats);
			updateYearRange(getDays());
			renderExportPreview();
			const howItWorksUsername = document.getElementById(ElementId.HowItWorksUsername);
			if (howItWorksUsername) howItWorksUsername.textContent = username;
			recordUsageEvent({ event: UsageEventName.CalendarRendered, properties: { source, year } });
		}
	} catch {
		showErrorState({ message: "could not reach the server, try again", year });
		recordUsageEvent({
			event: UsageEventName.CalendarRenderFailed,
			properties: { reason: CalendarFailureReason.Unreachable, year },
		});
	}

	renderButton.disabled = false;
	if (renderLabel) renderLabel.textContent = "render";
}

interface InitRadioListParams {
	selector: string;
	onChosen: () => void;
}

function initRadioList({ selector, onChosen }: InitRadioListParams) {
	const buttons = document.querySelectorAll<HTMLElement>(selector);
	initRovingGroup({
		elements: buttons,
		activate: (target) => activateRadio({ buttons, target }),
		onActivate: () => {
			renderCustomize();
			onChosen();
		},
	});
}

const recordPaletteChosen = (): void =>
	recordUsageEvent({ event: UsageEventName.PaletteChosen, properties: { palette: getActivePalette().key } });

const recordCellShapeChosen = (): void =>
	recordUsageEvent({ event: UsageEventName.CellShapeChosen, properties: { cellShape: getActiveShape() } });

const recordExportFormatChosen = (): void => {
	const format = getActiveExportTab();
	if (format !== null) recordUsageEvent({ event: UsageEventName.ExportFormatChosen, properties: { format } });
};

function initExportTabs() {
	const tabs = document.querySelectorAll<HTMLElement>(Selector.ExportTabKeys);
	initRovingGroup({
		elements: tabs,
		activate: (target) => activateTab({ tabs, target }),
		onActivate: () => {
			renderExportPreview();
			recordExportFormatChosen();
		},
		orientation: RovingOrientation.Horizontal,
	});
}

function syncSuggestionSelection(username: string) {
	const normalized = username.trim().toLowerCase();
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
	const yearSelect = document.getElementById(ElementId.HeroYear) as HTMLSelectElement | null;
	if (!input || !renderButton || !usernameDisplay) return;

	const submitRender = (source: CalendarRequestSource) => {
		const typed = input.value.trim().toLowerCase();
		if (!typed) {
			setHeroError("enter a GitHub username");
			input.focus();
			return;
		}
		const username = parseUsername(typed);
		if (isFailure(username)) {
			setHeroError(username.message);
			input.focus();
			return;
		}
		renderFromGitHub({ username: username.value, source });
	};

	form?.addEventListener("submit", (event) => {
		event.preventDefault();
		submitRender(CalendarRequestSource.Form);
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
	renderButton.addEventListener("click", () => submitRender(CalendarRequestSource.Form));
	yearSelect?.addEventListener("change", () => submitRender(CalendarRequestSource.Year));
	document.querySelectorAll<HTMLElement>(Selector.SuggestionButtons).forEach((button) => {
		button.addEventListener("click", () => {
			const username = button.dataset.username;
			if (!username) return;
			input.value = username;
			usernameDisplay.textContent = username;
			renderFromGitHub({ username, source: CalendarRequestSource.Suggestion });
		});
	});
}

function initHistoryNav() {
	globalThis.addEventListener("popstate", () => {
		const requested = readUsernameFromUrl(DEFAULT_USERNAME);
		const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
		const yearSelect = document.getElementById(ElementId.HeroYear) as HTMLSelectElement | null;
		const usernameDisplay = document.getElementById(ElementId.HeroUsernameDisplay);
		if (input) input.value = requested;
		if (usernameDisplay) usernameDisplay.textContent = requested;
		if (yearSelect) yearSelect.value = String(readYearFromUrl(CURRENT_YEAR));
		const username = parseUsername(requested);
		if (isFailure(username)) {
			setHeroError(username.message);
			return;
		}
		renderFromGitHub({ username: username.value, updateHistory: false, source: CalendarRequestSource.History });
	});
}

function initUsernameState() {
	const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
	const ssrUsername = input?.value.trim() || DEFAULT_USERNAME;
	setUsername(ssrUsername);

	const urlUser = readRequestedUsername();
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

	initUsernameState();
	renderCustomize();
	renderWidget();
	renderExportPreview();
	initRadioList({ selector: Selector.PaletteRows, onChosen: recordPaletteChosen });
	initRadioList({ selector: Selector.ShapeButtons, onChosen: recordCellShapeChosen });
	initExportTabs();
	initUsernameStrip();
	initHistoryNav();
	updateYearRange(days);
	initCellTooltip();
}

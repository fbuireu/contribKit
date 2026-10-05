import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { statsWithScrapedTotalContributions, UNKNOWN_CONTRIBUTION_STATS } from "@domain/services/contribution-stats";
import { toIsoDate } from "@domain/services/dates";
import { REQUEST_TIMEOUT_MS } from "@domain/value-objects/request-timeout";
import { FIRST_SUGGESTED_USERNAME, parseUsername, type Username } from "@domain/value-objects/username";
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
	renderCustomizer,
	renderExportPreview,
	renderHomeScreenWidget,
	setHeroError,
	updateHeroStats,
	updateHomeScreenWidgetStats,
	updateYearRange,
} from "./render";
import { activateRadio, activateTab, initRovingGroup, RovingOrientation } from "./roving";
import { getDays, setDays, setUsername } from "./state";
import { readRequestedUsername, readUsernameFromUrl, readYearFromUrl, syncUrl } from "./url";

const CURRENT_YEAR = new Date().getUTCFullYear();

const initialDays = (): readonly ContributionDay[] => {
	const injected = window.__INITIAL_DAYS__;
	return contributionGridSchema.validate(injected) ? toContributionDays(injected) : generateData();
};

export type ContributionsRequest = (url: string) => Promise<Response>;

const sendRequest: ContributionsRequest = (url) => fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

interface ShowErrorStateParams {
	message: string;
	year: number;
}

function showErrorState({ message, year }: ShowErrorStateParams): void {
	setHeroError(message);
	setDays(buildGridFromApi({ days: [], year }));
	renderCustomizer();
	updateHeroStats(UNKNOWN_CONTRIBUTION_STATS);
	updateHomeScreenWidgetStats(UNKNOWN_CONTRIBUTION_STATS);
}

export interface RenderFromGitHubParams {
	username: Username;
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

	if (updateHistory) syncUrl({ username: username.value, year, currentYear: CURRENT_YEAR });
	syncSuggestionSelection(username.value);
	setUsername(username);

	setHeroError(null);
	renderButton.disabled = true;
	if (renderLabel) renderLabel.textContent = "loading…";

	try {
		const response = await request(`/api/contributions?user=${encodeURIComponent(username.value)}&year=${year}`);
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
				properties: {
					reason: contributionFailureReason({ status: response.status, kind: failure?.kind, field: failure?.field }),
					year,
				},
			});
		} else {
			void writeUsernameCookie(username.value);
			const days = toContributionDays(body.days);
			setDays(buildGridFromApi({ days, year }));
			renderCustomizer();
			if (usernameDisplay) usernameDisplay.textContent = username.value;
			const stats = statsWithScrapedTotalContributions({
				days,
				year,
				today: toIsoDate(new Date()),
				scrapedTotalContributions: body.total,
			});
			updateHeroStats(stats);
			updateHomeScreenWidgetStats(stats);
			updateYearRange(getDays());
			renderExportPreview();
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
			renderCustomizer();
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
		renderFromGitHub({ username, source });
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
			const suggested = button.dataset.username;
			if (!suggested) return;
			const username = parseUsername(suggested);
			if (isFailure(username)) {
				setHeroError(username.message);
				return;
			}
			input.value = username.value;
			usernameDisplay.textContent = username.value;
			renderFromGitHub({ username, source: CalendarRequestSource.Suggestion });
		});
	});
}

function initHistoryNav() {
	globalThis.addEventListener("popstate", () => {
		const requested = readUsernameFromUrl(FIRST_SUGGESTED_USERNAME);
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
		renderFromGitHub({ username, updateHistory: false, source: CalendarRequestSource.History });
	});
}

function initUsernameState() {
	const input = document.getElementById(ElementId.HeroUsername) as HTMLInputElement | null;
	const ssrUsername = input?.value.trim() || FIRST_SUGGESTED_USERNAME;
	const parsed = parseUsername(ssrUsername);
	if (!isFailure(parsed)) setUsername(parsed);

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
	renderCustomizer();
	renderHomeScreenWidget();
	renderExportPreview();
	initRadioList({ selector: Selector.PaletteRows, onChosen: recordPaletteChosen });
	initRadioList({ selector: Selector.ShapeButtons, onChosen: recordCellShapeChosen });
	initExportTabs();
	initUsernameStrip();
	initHistoryNav();
	updateYearRange(days);
	initCellTooltip();
}

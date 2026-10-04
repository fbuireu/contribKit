// @vitest-environment happy-dom

import { isFailure } from "@domain/failures/failure";
import { DAYS_PER_WEEK, weeksFor } from "@domain/services/dates";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { MIN_YEAR } from "@domain/value-objects/year";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatHeroError } from "./contribution-errors";
import { ClassName, ElementId, Selector } from "./dom-contract";
import { initPage, renderFromGitHub } from "./page-init";
import { getDays, getUsername } from "./state";

const seedUsernameCookie = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const writeUsernameCookie = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const recordUsageEvent = vi.hoisted(() => vi.fn());
const CURRENT_YEAR = vi.hoisted(() => 2026);

vi.hoisted(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(CURRENT_YEAR, 8, 30, 12, 0, 0));
});

vi.mock("./cookie", async (importOriginal) => ({
	...(await importOriginal<typeof import("./cookie")>()),
	seedUsernameCookie,
	writeUsernameCookie,
}));
vi.mock("../components/core/telemetry/usage-event", async (importOriginal) => ({
	...(await importOriginal<typeof import("../components/core/telemetry/usage-event")>()),
	recordUsageEvent,
}));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const selectById = (id: string) => document.getElementById(id) as HTMLSelectElement | null;

const HERO = `
	<input id="${ElementId.HeroUsername}" value="" />
	<button id="${ElementId.HeroRenderButton}"></button>
	<span id="${ElementId.HeroRenderLabel}"></span>
	<div id="${ElementId.HeroGrid}"></div>
	<span id="${ElementId.HeroUsernameDisplay}"></span>
	<p id="${ElementId.HeroError}" hidden></p>
	<select id="${ElementId.HeroYear}"><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option></select>
`;

const SUGGESTIONS = `
	<button class="${ClassName.SuggestionButton}" data-username="torvalds"></button>
	<button class="${ClassName.SuggestionButton}" data-username="gaearon"></button>
	<button class="${ClassName.SuggestionButton}" id="nameless-suggestion"></button>
`;

interface JsonResponseParams {
	body: unknown;
	status?: number;
}

const jsonResponse = ({ body, status = 200 }: JsonResponseParams): Response =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const okPayload = { days: [{ date: `${CURRENT_YEAR}-06-15`, level: 3, count: 9 }], total: 9 };

const okFetch = () => Promise.resolve(jsonResponse({ body: okPayload }));

const notFoundFetch = () => Promise.resolve(jsonResponse({ body: { error: "User not found" }, status: 404 }));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const goTo = (search: string) => {
	globalThis.history.replaceState(null, "", `/${search}`);
};

interface InstalledListener {
	target: EventTarget;
	type: string;
	listener: EventListenerOrEventListenerObject;
}

const installed: InstalledListener[] = [];

const trackListenersOn = (target: EventTarget): void => {
	const add = target.addEventListener.bind(target);
	vi.spyOn(target, "addEventListener").mockImplementation((type, listener, options) => {
		if (listener) installed.push({ target, type, listener });
		add(type, listener, options);
	});
};

beforeEach(() => {
	seedUsernameCookie.mockClear();
	writeUsernameCookie.mockClear();
	recordUsageEvent.mockClear();
	trackListenersOn(document);
	trackListenersOn(globalThis);
	goTo("");
});

afterEach(() => {
	for (const { target, type, listener } of installed.splice(0)) target.removeEventListener(type, listener);
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

afterAll(() => {
	vi.useRealTimers();
});

describe("initPage", () => {
	it("wires the page without throwing on a minimal DOM", () => {
		document.body.innerHTML = "";
		expect(() => initPage()).not.toThrow();
	});

	it("renders the calendar svg into the hero grid container", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;
		initPage();
		expect(byId(ElementId.HeroGrid).innerHTML).toContain("<svg");
	});

	it("fills a full Contribution Grid even with no injected days", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;
		initPage();
		expect(getDays()).toHaveLength(53 * 7);
	});
});

describe("renderFromGitHub", () => {
	it("asks the endpoint for the username it was given", async () => {
		document.body.innerHTML = HERO;
		let requested = "";

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: (url) => {
				requested = url;
				return Promise.resolve(jsonResponse({ body: okPayload }));
			},
		});

		expect(requested).toContain("user=torvalds");
		expect(requested).toContain(`year=${CURRENT_YEAR}`);
	});

	it("clamps a year past the current one rather than asking for it", async () => {
		document.body.innerHTML = HERO;
		byId(ElementId.HeroYear).innerHTML = `<option value="${CURRENT_YEAR + 5}" selected>${CURRENT_YEAR + 5}</option>`;
		let requested = "";

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: (url) => {
				requested = url;
				return Promise.resolve(jsonResponse({ body: okPayload }));
			},
		});

		expect(requested).toContain(`year=${CURRENT_YEAR}`);
	});

	it("asks for the current year when the select names a year before the product's first, and publishes no year", async () => {
		document.body.innerHTML = HERO;
		byId(ElementId.HeroYear).innerHTML = `<option value="${MIN_YEAR - 1}" selected>${MIN_YEAR - 1}</option>`;
		let requested = "";

		await renderFromGitHub({
			username: "torvalds",
			request: (url) => {
				requested = url;
				return Promise.resolve(jsonResponse({ body: okPayload }));
			},
		});

		expect(requested).toContain(`year=${CURRENT_YEAR}`);
		expect(new URLSearchParams(globalThis.location.search).has("year")).toBe(false);
	});

	it("builds the grid from the days the endpoint answered with", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: okPayload })),
		});

		expect(getDays()).toHaveLength(weeksFor(CURRENT_YEAR) * DAYS_PER_WEEK);
		expect(getDays().find((day) => day.date === `${CURRENT_YEAR}-06-15`)?.count).toBe(9);
		expect(getUsername()).toBe("torvalds");
	});

	it("shows our own sentence for a status we recognise", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "nope",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: { error: "User not found" }, status: 404 })),
		});

		expect(byId(ElementId.HeroError).textContent).toMatch(/not found/i);
	});

	it("empties the grid on a failure rather than leaving the previous calendar up", async () => {
		document.body.innerHTML = HERO;
		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: okPayload })),
		});

		await renderFromGitHub({
			username: "nope",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: { error: "User not found" }, status: 404 })),
		});

		expect(getDays().every((day) => day.count === null)).toBe(true);
	});

	it("reports an unreachable server rather than throwing out of the handler", async () => {
		document.body.innerHTML = HERO;

		await expect(
			renderFromGitHub({
				username: "torvalds",
				updateHistory: false,
				request: () => Promise.reject(new Error("offline")),
			}),
		).resolves.toBeUndefined();

		expect(byId(ElementId.HeroError).textContent).toMatch(/could not reach the server/i);
	});

	it("re-enables the render button whichever way the request went", async () => {
		document.body.innerHTML = HERO;
		const button = byId(ElementId.HeroRenderButton) as HTMLButtonElement;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.reject(new Error("offline")),
		});

		expect(button.disabled).toBe(false);
		expect(byId(ElementId.HeroRenderLabel).textContent).toBe("render");
	});
});

describe("the username cookie", () => {
	it("is written only once the answer is known, never on submit", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(writeUsernameCookie).toHaveBeenCalledWith("torvalds");
	});

	it("is not written for a username the endpoint refused", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalsd", updateHistory: false, request: notFoundFetch });

		expect(writeUsernameCookie).not.toHaveBeenCalled();
	});

	it("is not written when the server could not be reached at all", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.reject(new Error("offline")),
		});

		expect(writeUsernameCookie).not.toHaveBeenCalled();
	});

	it("is seeded from the server-rendered username when the URL names nobody", () => {
		document.body.innerHTML = `<input id="${ElementId.HeroUsername}" value="torvalds" /><div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(seedUsernameCookie).toHaveBeenCalledWith("torvalds");
	});

	it("is left alone when the URL already names someone", () => {
		goTo("?user=torvalds");
		document.body.innerHTML = `<input id="${ElementId.HeroUsername}" value="torvalds" /><div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(seedUsernameCookie).not.toHaveBeenCalled();
	});
});

describe("initPage", () => {
	it("writes the server-rendered username into the URL when the two disagree", () => {
		goTo("?user=someone-else");
		document.body.innerHTML = `<input id="${ElementId.HeroUsername}" value="torvalds" /><div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(new URLSearchParams(globalThis.location.search).get("user")).toBe("torvalds");
		expect(getUsername()).toBe("torvalds");
	});

	it("falls back to the default username when nothing names one", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(getUsername()).toBe(DEFAULT_USERNAME);
	});

	it("names the year the grid covers", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div><span id="${ElementId.HeroYearRange}"></span>`;

		initPage();

		expect(byId(ElementId.HeroYearRange).textContent).toMatch(/^\d{4}$/);
	});
});

describe("the suggestion buttons", () => {
	it("mark the one whose username is being shown and unmark the rest", async () => {
		document.body.innerHTML = HERO + SUGGESTIONS;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		const [torvalds, gaearon] = document.querySelectorAll<HTMLElement>(Selector.SuggestionButtons);

		expect(torvalds.classList.contains(ClassName.Selected)).toBe(true);
		expect(torvalds.getAttribute("aria-pressed")).toBe("true");
		expect(gaearon.classList.contains(ClassName.Selected)).toBe(false);
		expect(gaearon.getAttribute("aria-pressed")).toBe("false");
	});

	it("render the username they carry when clicked", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO + SUGGESTIONS;
		initPage();

		document.querySelector<HTMLElement>(`.${ClassName.SuggestionButton}[data-username="gaearon"]`)?.click();
		await settle();

		expect((byId(ElementId.HeroUsername) as HTMLInputElement).value).toBe("gaearon");
		expect(byId(ElementId.HeroUsernameDisplay).textContent).toBe("gaearon");
	});

	it("do nothing when they name no username", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO + SUGGESTIONS;
		initPage();

		byId("nameless-suggestion").click();
		await settle();

		expect(fetchStub).not.toHaveBeenCalled();
	});
});

describe("the username strip", () => {
	it("refuses an empty submission rather than asking the endpoint for nobody", () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO;
		initPage();

		(byId(ElementId.HeroRenderButton) as HTMLButtonElement).click();

		expect(fetchStub).not.toHaveBeenCalled();
		expect(byId(ElementId.HeroError).textContent).toMatch(/enter a github username/i);
	});

	it("refuses a malformed username with the domain's sentence, before any request", () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds!";
		const refusal = parseUsername("torvalds!");
		if (!isFailure(refusal)) throw new Error("fixture is a Username");

		(byId(ElementId.HeroRenderButton) as HTMLButtonElement).click();

		expect(fetchStub).not.toHaveBeenCalled();
		expect(recordUsageEvent).not.toHaveBeenCalled();
		expect(byId(ElementId.HeroError).textContent).toBe(formatHeroError(refusal.message));
		expect(document.activeElement).toBe(byId(ElementId.HeroUsername));
	});

	it("submits the form without letting the browser navigate away", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = `<form id="${ElementId.UsernameForm}">${HERO}</form>`;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds";

		const submit = new Event("submit", { bubbles: true, cancelable: true });
		byId(ElementId.UsernameForm).dispatchEvent(submit);
		await settle();

		expect(submit.defaultPrevented).toBe(true);
		expect(fetchStub).toHaveBeenCalledWith(expect.stringContaining("user=torvalds"));
	});

	it("lowercases what is typed and keeps the caret where it was", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId(ElementId.HeroUsername) as HTMLInputElement;

		input.value = "TorValds";
		input.setSelectionRange(4, 4);
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(input.value).toBe("torvalds");
		expect(input.selectionStart).toBe(4);
		expect(byId(ElementId.HeroUsernameDisplay).textContent).toBe("torvalds");
	});

	it("shows the placeholder again once the field is emptied", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId(ElementId.HeroUsername) as HTMLInputElement;

		input.value = "  ";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(byId(ElementId.HeroUsernameDisplay).textContent).toBe("username");
	});

	it("clears a standing error as soon as something is typed", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId(ElementId.HeroUsername) as HTMLInputElement;

		(byId(ElementId.HeroRenderButton) as HTMLButtonElement).click();
		expect(byId(ElementId.HeroError).textContent).not.toBe("");

		input.value = "t";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(byId(ElementId.HeroError).textContent).toBe("");
	});
});

describe("the year select", () => {
	const TWO_YEARS = `<option value="${CURRENT_YEAR - 1}">${CURRENT_YEAR - 1}</option><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option>`;

	it("renders the year picked without waiting for the render button", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO;
		byId(ElementId.HeroYear).innerHTML = TWO_YEARS;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds";

		const select = selectById(ElementId.HeroYear) as HTMLSelectElement;
		select.value = String(CURRENT_YEAR - 1);
		select.dispatchEvent(new Event("change", { bubbles: true }));
		await settle();

		expect(fetchStub).toHaveBeenCalledTimes(1);
		expect(fetchStub).toHaveBeenCalledWith(expect.stringContaining(`user=torvalds&year=${CURRENT_YEAR - 1}`));
	});

	it("refuses to ask the endpoint for nobody, exactly as the render button does", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO;
		byId(ElementId.HeroYear).innerHTML = TWO_YEARS;
		initPage();

		const select = selectById(ElementId.HeroYear) as HTMLSelectElement;
		select.value = String(CURRENT_YEAR - 1);
		select.dispatchEvent(new Event("change", { bubbles: true }));
		await settle();

		expect(fetchStub).not.toHaveBeenCalled();
		expect(byId(ElementId.HeroError).textContent).toMatch(/enter a github username/i);
	});
});

describe("history navigation", () => {
	it("restores the username and year the URL names, without pushing a new entry", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = `${HERO}<span id="${ElementId.HeroYearRange}"></span>`;
		byId(ElementId.HeroYear).innerHTML =
			`<option value="${CURRENT_YEAR - 1}">${CURRENT_YEAR - 1}</option><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option>`;
		initPage();

		goTo(`?user=gaearon&year=${CURRENT_YEAR - 1}`);
		globalThis.dispatchEvent(new PopStateEvent("popstate"));
		await settle();

		expect((byId(ElementId.HeroUsername) as HTMLInputElement).value).toBe("gaearon");
		expect(byId(ElementId.HeroUsernameDisplay).textContent).toBe("gaearon");
		expect(selectById(ElementId.HeroYear)?.value).toBe(String(CURRENT_YEAR - 1));
		expect(new URLSearchParams(globalThis.location.search).get("user")).toBe("gaearon");
		expect(fetchStub).toHaveBeenCalledOnce();
		expect(fetchStub).toHaveBeenCalledWith(expect.stringContaining(`user=gaearon&year=${CURRENT_YEAR - 1}`));
	});

	it("refuses a malformed username the URL names with the domain's sentence, before any request", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = HERO;
		initPage();
		const refusal = parseUsername("torvalds!");
		if (!isFailure(refusal)) throw new Error("fixture is a Username");

		goTo("?user=torvalds!");
		globalThis.dispatchEvent(new PopStateEvent("popstate"));
		await settle();

		expect(fetchStub).not.toHaveBeenCalled();
		expect(recordUsageEvent).not.toHaveBeenCalled();
		expect(byId(ElementId.HeroError).textContent).toBe(formatHeroError(refusal.message));
		expect((byId(ElementId.HeroUsername) as HTMLInputElement).value).toBe("torvalds!");
	});
});

describe("a successful render", () => {
	it("names the username everywhere the page shows it", async () => {
		document.body.innerHTML = `${HERO}<span id="${ElementId.HowItWorksUsername}"></span><span id="${ElementId.HeroYearRange}"></span>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(byId(ElementId.HeroUsernameDisplay).textContent).toBe("torvalds");
		expect(byId(ElementId.HowItWorksUsername).textContent).toBe("torvalds");
		expect(byId(ElementId.HeroYearRange).textContent).toBe(String(CURRENT_YEAR));
	});

	it("prints the scraped total rather than recomputing one", async () => {
		document.body.innerHTML = `${HERO}<span class="${ClassName.BarTag}"></span><span class="${ClassName.LegendStats}"></span>`;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: { ...okPayload, total: 42 } })),
		});

		expect(document.querySelector(Selector.BarTag)?.textContent).toBe("42 contributions");
	});
});

describe("an error state", () => {
	it("prints the total as unknown and replaces the previous user's streaks", async () => {
		document.body.innerHTML = `${HERO}<span class="${ClassName.BarTag}"></span><span class="${ClassName.LegendStats}"></span>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });
		expect(document.querySelector(Selector.LegendStats)?.textContent).toContain("1 longest");

		await renderFromGitHub({ username: "nope", updateHistory: false, request: notFoundFetch });

		expect(document.querySelector(Selector.BarTag)?.textContent).toContain("unknown");
		expect(document.querySelector(Selector.LegendStats)?.textContent).not.toContain("1 longest");
	});

	it("prints no Streak as 0, because zero is a number", async () => {
		document.body.innerHTML = `${HERO}<span class="${ClassName.BarTag}"></span><span class="${ClassName.LegendStats}"></span>`;

		await renderFromGitHub({ username: "nope", updateHistory: false, request: notFoundFetch });

		expect(document.querySelector(Selector.BarTag)?.textContent).toBe("unknown contributions");
		expect(document.querySelector(Selector.LegendStats)?.textContent).toBe("unknown day streak·unknown longest");
	});

	it("says GitHub answered when its page could not be read, recording the reason it always recorded", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () =>
				Promise.resolve(jsonResponse({ body: { error: "Could not parse contributions", kind: "Parse" }, status: 502 })),
		});

		expect(byId(ElementId.HeroError).textContent).toBe(
			"↳ github answered, but the contribution calendar could not be read",
		);
		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "upstream", year: CURRENT_YEAR } }],
		]);
	});

	it("names a rejected Year rather than the Username, recording the reason it always recorded", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () =>
				Promise.resolve(
					jsonResponse({
						body: { error: "Year must be between 2005 and 2025", kind: "InvalidInput", field: "year" },
						status: 400,
					}),
				),
		});

		expect(byId(ElementId.HeroError).textContent).toBe("↳ invalid year");
		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "invalid_username", year: CURRENT_YEAR } }],
		]);
	});

	it("prefers the endpoint's own message when the status is not one we have a sentence for", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: { error: "teapot" }, status: 418 })),
		});

		expect(byId(ElementId.HeroError).textContent).toContain("teapot");
	});
});

describe("a body that is not the shape the endpoint promises", () => {
	const renderWith = (response: Response) =>
		renderFromGitHub({ username: "torvalds", updateHistory: false, request: () => Promise.resolve(response) });

	it.each([
		["no days", { total: 9 }],
		["days that are not a list", { days: "none", total: 9 }],
		["a Count that is a string", { days: [{ date: `${CURRENT_YEAR}-06-15`, level: 3, count: "9" }], total: 9 }],
		["a negative Count", { days: [{ date: `${CURRENT_YEAR}-06-15`, level: 3, count: -1 }], total: null }],
		["a total that is a string", { ...okPayload, total: "lots" }],
		["null", null],
	])("refuses a 200 with %s: an error state, not a garbage calendar", async (_, body) => {
		document.body.innerHTML = `${HERO}<span class="${ClassName.BarTag}"></span>`;

		await renderWith(jsonResponse({ body }));

		expect(byId(ElementId.HeroError).textContent).toContain("something went wrong");
		expect(document.querySelector(Selector.BarTag)?.textContent).toContain("unknown");
		expect(getDays().every((day) => day.count === null)).toBe(true);
		expect(writeUsernameCookie).not.toHaveBeenCalled();
		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "unknown", year: CURRENT_YEAR } }],
		]);
	});

	it("names the status of an error body that is not JSON, instead of calling the server unreachable", async () => {
		document.body.innerHTML = HERO;

		await renderWith(new Response("<!DOCTYPE html><title>Too Many Requests</title>", { status: 429 }));

		expect(byId(ElementId.HeroError).textContent).toMatch(/too many requests/i);
		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "rate_limited", year: CURRENT_YEAR } }],
		]);
	});

	it("ignores an error field that is not a string and falls back to its own sentence", async () => {
		document.body.innerHTML = HERO;

		await renderWith(jsonResponse({ body: { error: 418 }, status: 418 }));

		expect(byId(ElementId.HeroError).textContent).toContain("something went wrong");
	});

	it("drops a day whose date is not a calendar date and keeps the rest", async () => {
		document.body.innerHTML = HERO;
		const days = [...okPayload.days, { date: `${CURRENT_YEAR}-02-30`, level: 2, count: 1 }];

		await renderWith(jsonResponse({ body: { days, total: null } }));

		expect(byId(ElementId.HeroError).hidden).toBe(true);
		expect(getDays().find((day) => day.date === `${CURRENT_YEAR}-06-15`)?.count).toBe(9);
		expect(getDays().some((day) => day.date === `${CURRENT_YEAR}-02-30`)).toBe(false);
	});
});

describe("renderFromGitHub with a half-rendered page", () => {
	it("does nothing at all when the render button is missing", async () => {
		const request = vi.fn(okFetch);
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request });

		expect(request).not.toHaveBeenCalled();
	});

	it("does nothing at all when the grid container is missing", async () => {
		const request = vi.fn(okFetch);
		document.body.innerHTML = `<button id="${ElementId.HeroRenderButton}"></button>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request });

		expect(request).not.toHaveBeenCalled();
	});

	it("asks for the current year when there is no year select to read", async () => {
		let requested = "";
		document.body.innerHTML = `<button id="${ElementId.HeroRenderButton}"></button><div id="${ElementId.HeroGrid}"></div>`;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: (url) => {
				requested = url;
				return okFetch();
			},
		});

		expect(requested).toContain(`year=${CURRENT_YEAR}`);
	});
});

describe("history syncing", () => {
	it("publishes the username it rendered", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalds", request: okFetch });

		expect(new URLSearchParams(globalThis.location.search).get("user")).toBe("torvalds");
	});
});

describe("the grid the page starts with", () => {
	const injected = [
		{ date: `${CURRENT_YEAR}-01-01`, level: 1, count: 2 },
		{ date: `${CURRENT_YEAR}-01-02`, level: 0, count: 0 },
	];

	afterEach(() => {
		Reflect.deleteProperty(window, "__INITIAL_DAYS__");
	});

	it("uses what the server rendered rather than inventing a placeholder", () => {
		vi.stubGlobal("__INITIAL_DAYS__", injected);
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(getDays()).toStrictEqual(injected);
	});

	it("falls back to a placeholder when the server injected an empty list", () => {
		vi.stubGlobal("__INITIAL_DAYS__", []);
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(getDays()).toHaveLength(53 * 7);
	});

	it("falls back to a placeholder when an injected day is not a Contribution Day", () => {
		vi.stubGlobal("__INITIAL_DAYS__", [...injected, { date: `${CURRENT_YEAR}-01-03`, level: "2", count: null }]);
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(getDays()).toHaveLength(53 * 7);
	});

	it("falls back to a placeholder when the injected value is not a list at all", () => {
		vi.stubGlobal("__INITIAL_DAYS__", "not a grid");
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		initPage();

		expect(getDays()).toHaveLength(53 * 7);
	});
});

describe("the customize controls", () => {
	const CUSTOMIZE = `
		<div id="${ElementId.PaletteList}">
			<button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="github"></button>
			<button class="${ClassName.PaletteRow}" data-key="nord"></button>
		</div>
		<div id="${ElementId.ShapeList}">
			<button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="rounded"></button>
			<button class="${ClassName.ShapeButton}" data-key="square"></button>
		</div>
		<div id="${ElementId.ExportTabs}">
			<button data-key="png" aria-selected="true"></button>
			<button data-key="svg" aria-selected="false"></button>
		</div>
		<div id="${ElementId.CustomGrid}"></div>
		<span id="${ElementId.CustomPaletteLabel}"></span>
		<span id="${ElementId.CustomShapeLabel}"></span>
		<div id="${ElementId.ExportPreview}"></div>
	`;

	it("repaints the grid in the Palette the reader picked", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>(`.${ClassName.PaletteRow}[data-key="nord"]`)?.click();

		expect(byId(ElementId.CustomPaletteLabel).textContent).toBe("nord");
	});

	it("repaints the grid in the Cell Shape the reader picked", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>(`.${ClassName.ShapeButton}[data-key="square"]`)?.click();

		expect(byId(ElementId.CustomShapeLabel).textContent).toBe("square");
	});

	it("re-renders the export preview when the reader changes tab", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>(`#${ElementId.ExportTabs} [data-key="svg"]`)?.click();

		expect(document.querySelector(Selector.ExportCodePreview)).not.toBeNull();
	});
});

describe("history navigation on a half-rendered page", () => {
	it("restores nothing it cannot find, rather than throwing, and still renders the username", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = `<button id="${ElementId.HeroRenderButton}"></button><div id="${ElementId.HeroGrid}"></div>`;
		initPage();

		goTo("?user=gaearon");

		expect(() => globalThis.dispatchEvent(new PopStateEvent("popstate"))).not.toThrow();
		await settle();

		expect(fetchStub).toHaveBeenCalledOnce();
		expect(fetchStub).toHaveBeenCalledWith(expect.stringContaining("user=gaearon"));
	});
});

describe("the username field", () => {
	it("leaves the caret alone when the browser reports none", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId(ElementId.HeroUsername) as HTMLInputElement;
		const setSelectionRange = vi.spyOn(input, "setSelectionRange");
		vi.spyOn(input, "selectionStart", "get").mockReturnValue(null);

		input.value = "TORVALDS";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(input.value).toBe("torvalds");
		expect(setSelectionRange).not.toHaveBeenCalled();
	});

	it("marks the suggestion matching what is already typed when the page loads", () => {
		document.body.innerHTML = `${HERO}${SUGGESTIONS}`;
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "  GAEARON ";

		initPage();

		const gaearon = document.querySelector<HTMLElement>(`.${ClassName.SuggestionButton}[data-username="gaearon"]`);

		expect(gaearon?.getAttribute("aria-pressed")).toBe("true");
	});
});

describe("the Usage Event a render records", () => {
	it("names the form as the source and the year it asked for on success", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_rendered", properties: { source: "form", year: CURRENT_YEAR } }],
		]);
	});

	it("carries the source it was handed", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch, source: "history" });

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_rendered", properties: { source: "history", year: CURRENT_YEAR } }],
		]);
	});

	it("records a refused status as a closed reason, never the username", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({ username: "torvalsd", updateHistory: false, request: notFoundFetch });

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "not_found", year: CURRENT_YEAR } }],
		]);
		expect(JSON.stringify(recordUsageEvent.mock.calls)).not.toContain("torvalsd");
	});

	it("records an unreachable server as its own reason", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.reject(new Error("offline")),
		});

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "calendar_render_failed", properties: { reason: "unreachable", year: CURRENT_YEAR } }],
		]);
	});

	it("records nothing when the page has no render button to drive", async () => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});
});

describe("the source each control reports", () => {
	const TWO_YEARS = `<option value="${CURRENT_YEAR - 1}">${CURRENT_YEAR - 1}</option><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option>`;

	interface RenderedParams {
		source: string;
		year?: number;
	}

	const rendered = ({ source, year = CURRENT_YEAR }: RenderedParams) =>
		expect(recordUsageEvent.mock.calls).toEqual([[{ event: "calendar_rendered", properties: { source, year } }]]);

	it("is form for the render button", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds";

		(byId(ElementId.HeroRenderButton) as HTMLButtonElement).click();
		await settle();

		rendered({ source: "form" });
	});

	it("is form for the submitted form", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = `<form id="${ElementId.UsernameForm}">${HERO}</form>`;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds";

		byId(ElementId.UsernameForm).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		await settle();

		rendered({ source: "form" });
	});

	it("is suggestion for a suggestion button", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO + SUGGESTIONS;
		initPage();

		document.querySelector<HTMLElement>(`.${ClassName.SuggestionButton}[data-username="gaearon"]`)?.click();
		await settle();

		rendered({ source: "suggestion" });
	});

	it("is year for the year select", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO;
		byId(ElementId.HeroYear).innerHTML = TWO_YEARS;
		initPage();
		(byId(ElementId.HeroUsername) as HTMLInputElement).value = "torvalds";

		const select = selectById(ElementId.HeroYear) as HTMLSelectElement;
		select.value = String(CURRENT_YEAR - 1);
		select.dispatchEvent(new Event("change", { bubbles: true }));
		await settle();

		rendered({ source: "year", year: CURRENT_YEAR - 1 });
	});

	it("is history for a popstate", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO;
		initPage();

		goTo("?user=gaearon");
		globalThis.dispatchEvent(new PopStateEvent("popstate"));
		await settle();

		rendered({ source: "history" });
	});

	it("records nothing when an empty submission is refused", () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO;
		initPage();

		(byId(ElementId.HeroRenderButton) as HTMLButtonElement).click();

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});
});

describe("the Usage Events the customize controls record", () => {
	const CUSTOMIZE = `
		<div id="${ElementId.PaletteList}">
			<button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="github"></button>
			<button class="${ClassName.PaletteRow}" data-key="nord"></button>
		</div>
		<div id="${ElementId.ShapeList}">
			<button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="rounded"></button>
			<button class="${ClassName.ShapeButton}" data-key="square"></button>
		</div>
		<div id="${ElementId.ExportTabs}">
			<button data-key="png" aria-selected="true"></button>
			<button data-key="svg" aria-selected="false"></button>
			<button data-key="pdf" aria-selected="false"></button>
		</div>
		<div id="${ElementId.ExportPreview}"></div>
	`;

	beforeEach(() => {
		document.body.innerHTML = `<div id="${ElementId.HeroGrid}"></div>${CUSTOMIZE}`;
		initPage();
	});

	it("names the Palette key after a palette row is picked", () => {
		document.querySelector<HTMLElement>(`.${ClassName.PaletteRow}[data-key="nord"]`)?.click();

		expect(recordUsageEvent.mock.calls).toEqual([[{ event: "palette_chosen", properties: { palette: "nord" } }]]);
	});

	it("names the Cell Shape after a shape button is picked", () => {
		document.querySelector<HTMLElement>(`.${ClassName.ShapeButton}[data-key="square"]`)?.click();

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "cell_shape_chosen", properties: { cellShape: "square" } }],
		]);
	});

	it("names the Export Format after a tab is picked", () => {
		document.querySelector<HTMLElement>(`#${ElementId.ExportTabs} [data-key="svg"]`)?.click();

		expect(recordUsageEvent.mock.calls).toEqual([[{ event: "export_format_chosen", properties: { format: "svg" } }]]);
	});

	it("records no format for a tab whose key is not an Export Format", () => {
		document.querySelector<HTMLElement>(`#${ElementId.ExportTabs} [data-key="pdf"]`)?.click();

		expect(recordUsageEvent).not.toHaveBeenCalled();
	});

	it("records nothing on load, before anything is picked", () => {
		expect(recordUsageEvent).not.toHaveBeenCalled();
	});
});

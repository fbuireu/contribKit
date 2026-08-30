// @vitest-environment happy-dom

import { DEFAULT_USERNAME } from "@domain/value-objects/username";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initPage, renderFromGitHub } from "./page-init";
import { getDays, getUsername } from "./state";

const seedUsernameCookie = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const writeUsernameCookie = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("./cookie", () => ({ seedUsernameCookie, writeUsernameCookie }));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const selectById = (id: string) => document.getElementById(id) as HTMLSelectElement | null;

const CURRENT_YEAR = new Date().getFullYear();

const HERO = `
	<input id="hero-username" value="" />
	<button id="hero-render-btn"></button>
	<span id="hero-render-label"></span>
	<div id="hero-grid-container"></div>
	<span id="hero-username-display"></span>
	<p id="hero-error" hidden></p>
	<select id="hero-year"><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option></select>
`;

const SUGGESTIONS = `
	<button class="sug-btn" data-username="torvalds"></button>
	<button class="sug-btn" data-username="gaearon"></button>
	<button class="sug-btn" id="nameless-suggestion"></button>
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

beforeEach(() => {
	seedUsernameCookie.mockClear();
	writeUsernameCookie.mockClear();
	goTo("");
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

describe("initPage", () => {
	it("wires the page without throwing on a minimal DOM", () => {
		document.body.innerHTML = "";
		expect(() => initPage()).not.toThrow();
	});

	it("renders the calendar svg into the hero grid container", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;
		initPage();
		expect(byId("hero-grid-container").innerHTML).toContain("<svg");
	});

	it("fills a full Contribution Grid even with no injected days", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;
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
		byId("hero-year").innerHTML = `<option value="${CURRENT_YEAR + 5}" selected>${CURRENT_YEAR + 5}</option>`;
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

	it("builds the grid from the days the endpoint answered with", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: okPayload })),
		});

		expect(getDays()).toHaveLength(53 * 7);
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

		expect(byId("hero-error").textContent).toMatch(/not found/i);
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

		expect(byId("hero-error").textContent).toMatch(/could not reach the server/i);
	});

	it("re-enables the render button whichever way the request went", async () => {
		document.body.innerHTML = HERO;
		const button = byId("hero-render-btn") as HTMLButtonElement;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.reject(new Error("offline")),
		});

		expect(button.disabled).toBe(false);
		expect(byId("hero-render-label").textContent).toBe("render");
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
		document.body.innerHTML = `<input id="hero-username" value="torvalds" /><div id="hero-grid-container"></div>`;

		initPage();

		expect(seedUsernameCookie).toHaveBeenCalledWith("torvalds");
	});

	it("is left alone when the URL already names someone", () => {
		goTo("?user=torvalds");
		document.body.innerHTML = `<input id="hero-username" value="torvalds" /><div id="hero-grid-container"></div>`;

		initPage();

		expect(seedUsernameCookie).not.toHaveBeenCalled();
	});
});

describe("initPage", () => {
	it("writes the server-rendered username into the URL when the two disagree", () => {
		goTo("?user=someone-else");
		document.body.innerHTML = `<input id="hero-username" value="torvalds" /><div id="hero-grid-container"></div>`;

		initPage();

		expect(new URLSearchParams(globalThis.location.search).get("user")).toBe("torvalds");
		expect(getUsername()).toBe("torvalds");
	});

	it("falls back to the default username when nothing names one", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		initPage();

		expect(getUsername()).toBe(DEFAULT_USERNAME);
	});

	it("names the year the grid covers", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div><span id="hero-year-range"></span>`;

		initPage();

		expect(byId("hero-year-range").textContent).toMatch(/^\d{4}$/);
	});
});

describe("the suggestion buttons", () => {
	it("mark the one whose username is being shown and unmark the rest", async () => {
		document.body.innerHTML = HERO + SUGGESTIONS;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		const [torvalds, gaearon] = document.querySelectorAll<HTMLElement>(".sug-btn");

		expect(torvalds.classList.contains("selected")).toBe(true);
		expect(torvalds.getAttribute("aria-pressed")).toBe("true");
		expect(gaearon.classList.contains("selected")).toBe(false);
		expect(gaearon.getAttribute("aria-pressed")).toBe("false");
	});

	it("render the username they carry when clicked", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = HERO + SUGGESTIONS;
		initPage();

		document.querySelector<HTMLElement>('.sug-btn[data-username="gaearon"]')?.click();
		await settle();

		expect((byId("hero-username") as HTMLInputElement).value).toBe("gaearon");
		expect(byId("hero-username-display").textContent).toBe("gaearon");
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

		(byId("hero-render-btn") as HTMLButtonElement).click();

		expect(fetchStub).not.toHaveBeenCalled();
		expect(byId("hero-error").textContent).toMatch(/enter a github username/i);
	});

	it("submits the form without letting the browser navigate away", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = `<form id="username-form">${HERO}</form>`;
		initPage();
		(byId("hero-username") as HTMLInputElement).value = "torvalds";

		const submit = new Event("submit", { bubbles: true, cancelable: true });
		byId("username-form").dispatchEvent(submit);
		await settle();

		expect(submit.defaultPrevented).toBe(true);
		expect(fetchStub).toHaveBeenCalledWith(expect.stringContaining("user=torvalds"));
	});

	it("lowercases what is typed and keeps the caret where it was", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId("hero-username") as HTMLInputElement;

		input.value = "TorValds";
		input.setSelectionRange(4, 4);
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(input.value).toBe("torvalds");
		expect(input.selectionStart).toBe(4);
		expect(byId("hero-username-display").textContent).toBe("torvalds");
	});

	it("shows the placeholder again once the field is emptied", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId("hero-username") as HTMLInputElement;

		input.value = "  ";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(byId("hero-username-display").textContent).toBe("username");
	});

	it("clears a standing error as soon as something is typed", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId("hero-username") as HTMLInputElement;

		(byId("hero-render-btn") as HTMLButtonElement).click();
		expect(byId("hero-error").textContent).not.toBe("");

		input.value = "t";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(byId("hero-error").textContent).toBe("");
	});

	it("is not wired at all when the strip is not on the page", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		expect(() => initPage()).not.toThrow();
	});
});

describe("history navigation", () => {
	it("restores the username and year the URL names, without pushing a new entry", async () => {
		const fetchStub = vi.fn(okFetch);
		vi.stubGlobal("fetch", fetchStub);
		document.body.innerHTML = `${HERO}<span id="hero-year-range"></span>`;
		byId("hero-year").innerHTML =
			`<option value="${CURRENT_YEAR - 1}">${CURRENT_YEAR - 1}</option><option value="${CURRENT_YEAR}" selected>${CURRENT_YEAR}</option>`;
		initPage();

		goTo(`?user=gaearon&year=${CURRENT_YEAR - 1}`);
		globalThis.dispatchEvent(new PopStateEvent("popstate"));
		await settle();

		expect((byId("hero-username") as HTMLInputElement).value).toBe("gaearon");
		expect(byId("hero-username-display").textContent).toBe("gaearon");
		expect(selectById("hero-year")?.value).toBe(String(CURRENT_YEAR - 1));
		expect(new URLSearchParams(globalThis.location.search).get("user")).toBe("gaearon");
	});
});

describe("a successful render", () => {
	it("names the username everywhere the page shows it", async () => {
		document.body.innerHTML = `${HERO}<span id="how-widget-username"></span><span id="hero-year-range"></span>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(byId("hero-username-display").textContent).toBe("torvalds");
		expect(byId("how-widget-username").textContent).toBe("torvalds");
		expect(byId("hero-year-range").textContent).toBe(String(CURRENT_YEAR));
	});

	it("prints the scraped total rather than recomputing one", async () => {
		document.body.innerHTML = `${HERO}<span class="bar-tag"></span><span class="legend-stats"></span>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });

		expect(document.querySelector(".bar-tag")?.textContent).toContain("9");
	});
});

describe("an error state", () => {
	it("leaves no number on screen, because zero would read as a measurement", async () => {
		document.body.innerHTML = `${HERO}<span class="bar-tag"></span><span class="legend-stats"></span>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request: okFetch });
		await renderFromGitHub({ username: "nope", updateHistory: false, request: notFoundFetch });

		expect(document.querySelector(".bar-tag")?.textContent).toContain("unknown");
		expect(document.querySelector(".legend-stats")?.textContent).toContain("0 day streak");
	});

	it("prefers the endpoint's own message when the status is not one we have a sentence for", async () => {
		document.body.innerHTML = HERO;

		await renderFromGitHub({
			username: "torvalds",
			updateHistory: false,
			request: () => Promise.resolve(jsonResponse({ body: { error: "teapot" }, status: 418 })),
		});

		expect(byId("hero-error").textContent).toContain("teapot");
	});
});

describe("renderFromGitHub with a half-rendered page", () => {
	it("does nothing at all when the render button is missing", async () => {
		const request = vi.fn(okFetch);
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request });

		expect(request).not.toHaveBeenCalled();
	});

	it("does nothing at all when the grid container is missing", async () => {
		const request = vi.fn(okFetch);
		document.body.innerHTML = `<button id="hero-render-btn"></button>`;

		await renderFromGitHub({ username: "torvalds", updateHistory: false, request });

		expect(request).not.toHaveBeenCalled();
	});

	it("asks for the current year when there is no year select to read", async () => {
		let requested = "";
		document.body.innerHTML = `<button id="hero-render-btn"></button><div id="hero-grid-container"></div>`;

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
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		initPage();

		expect(getDays()).toStrictEqual(injected);
	});

	it("falls back to a placeholder when the server injected an empty list", () => {
		vi.stubGlobal("__INITIAL_DAYS__", []);
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		initPage();

		expect(getDays()).toHaveLength(53 * 7);
	});

	it("falls back to a placeholder when the injected value is not a list at all", () => {
		vi.stubGlobal("__INITIAL_DAYS__", "not a grid");
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;

		initPage();

		expect(getDays()).toHaveLength(53 * 7);
	});
});

describe("the customize controls", () => {
	const CUSTOMIZE = `
		<div id="palette-list">
			<button class="palette-row active" data-key="github"></button>
			<button class="palette-row" data-key="nord"></button>
		</div>
		<div id="shape-list">
			<button class="shape-btn active" data-key="rounded"></button>
			<button class="shape-btn" data-key="square"></button>
		</div>
		<div id="export-tabs">
			<button data-key="png" aria-selected="true"></button>
			<button data-key="svg" aria-selected="false"></button>
		</div>
		<div id="custom-grid-container"></div>
		<span id="custom-palette-label"></span>
		<span id="custom-shape-label"></span>
		<div id="export-preview"></div>
	`;

	it("repaints the grid in the Palette the reader picked", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>('.palette-row[data-key="nord"]')?.click();

		expect(byId("custom-palette-label").textContent).toBe("nord");
	});

	it("repaints the grid in the Cell Shape the reader picked", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>('.shape-btn[data-key="square"]')?.click();

		expect(byId("custom-shape-label").textContent).toBe("square");
	});

	it("re-renders the export preview when the reader changes tab", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>${CUSTOMIZE}`;
		initPage();

		document.querySelector<HTMLElement>('#export-tabs [data-key="svg"]')?.click();

		expect(document.querySelector("#export-preview .code-preview")).not.toBeNull();
	});
});

describe("history navigation on a half-rendered page", () => {
	it("restores nothing it cannot find, rather than throwing", async () => {
		vi.stubGlobal("fetch", vi.fn(okFetch));
		document.body.innerHTML = `<button id="hero-render-btn"></button><div id="hero-grid-container"></div>`;
		initPage();

		goTo("?user=gaearon");

		expect(() => globalThis.dispatchEvent(new PopStateEvent("popstate"))).not.toThrow();
		await settle();
	});
});

describe("the username field", () => {
	it("leaves the caret alone when the browser reports none", () => {
		document.body.innerHTML = HERO;
		initPage();
		const input = byId("hero-username") as HTMLInputElement;
		const setSelectionRange = vi.spyOn(input, "setSelectionRange");
		vi.spyOn(input, "selectionStart", "get").mockReturnValue(null);

		input.value = "TORVALDS";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(input.value).toBe("torvalds");
		expect(setSelectionRange).not.toHaveBeenCalled();
	});

	it("marks the suggestion matching what is already typed when the page loads", () => {
		document.body.innerHTML = `${HERO}${SUGGESTIONS}`;
		(byId("hero-username") as HTMLInputElement).value = "  GAEARON ";

		initPage();

		const gaearon = document.querySelector<HTMLElement>('.sug-btn[data-username="gaearon"]');

		expect(gaearon?.getAttribute("aria-pressed")).toBe("true");
	});
});

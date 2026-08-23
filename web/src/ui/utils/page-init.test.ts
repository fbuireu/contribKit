// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { initPage, renderFromGitHub } from "./page-init";
import { getDays, getUsername } from "./state";

const byId = (id: string) => document.getElementById(id) as HTMLElement;

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

interface JsonResponseParams {
	body: unknown;
	status?: number;
}

const jsonResponse = ({ body, status = 200 }: JsonResponseParams): Response =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const okPayload = { days: [{ date: `${CURRENT_YEAR}-06-15`, level: 3, count: 9 }], total: 9 };

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

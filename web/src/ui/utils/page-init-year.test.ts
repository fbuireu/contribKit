// @vitest-environment happy-dom

import { isFailure } from "@domain/failures/failure";
import { parseUsername } from "@domain/value-objects/username";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElementId } from "./dom-contract";

const ZONE_AT_START = process.env.TZ;

afterEach(() => {
	if (ZONE_AT_START === undefined) delete process.env.TZ;
	else process.env.TZ = ZONE_AT_START;
	vi.useRealTimers();
	vi.resetModules();
	document.body.innerHTML = "";
});

interface RequestsMadeParams {
	zone: string;
	instant: string;
}

const requestsMade = async ({ zone, instant }: RequestsMadeParams): Promise<string[]> => {
	process.env.TZ = zone;
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(instant));
	const { renderFromGitHub } = await import("./page-init");
	const username = parseUsername("torvalds");
	if (isFailure(username)) throw new Error("fixture is not a Username");
	document.body.innerHTML = `
		<button id="${ElementId.HeroRenderButton}"></button>
		<div id="${ElementId.HeroGrid}"></div>
	`;
	const requested: string[] = [];

	await renderFromGitHub({
		username,
		updateHistory: false,
		request: (url) => {
			requested.push(url);
			return Promise.resolve(new Response(JSON.stringify({ days: [], total: 0 }), { status: 200 }));
		},
	});

	return requested;
};

describe("the year the landing asks for", () => {
	it("is the Worker's, read in UTC, while a visitor east of UTC is already in the next one", async () => {
		const requested = await requestsMade({ zone: "Pacific/Kiritimati", instant: "2026-12-31T12:00:00Z" });

		expect(new Date("2026-12-31T12:00:00Z").getFullYear(), "the visitor's zone is already in 2027").toBe(2027);
		expect(requested).toEqual(["/api/contributions?user=torvalds&year=2026"]);
	});

	it("is the Worker's too while a visitor west of UTC is still in the old one", async () => {
		const requested = await requestsMade({ zone: "Pacific/Honolulu", instant: "2027-01-01T05:00:00Z" });

		expect(new Date("2027-01-01T05:00:00Z").getFullYear(), "the visitor's zone is still in 2026").toBe(2026);
		expect(requested).toEqual(["/api/contributions?user=torvalds&year=2027"]);
	});
});

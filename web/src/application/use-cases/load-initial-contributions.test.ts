import { network } from "@domain/failures/failure";
import { MIN_YEAR } from "@domain/value-objects/year";
import { describe, expect, it, vi } from "vitest";
import { loadInitialContributions } from "./load-initial-contributions";

const calendar = {
	username: "torvalds",
	days: [{ date: "2024-06-15", level: 4, count: 16 }],
	totalContributions: 1234,
};

const CURRENT_YEAR = 2026;

describe("loadInitialContributions", () => {
	it("returns the built grid on success", async () => {
		const loadContributions = vi.fn().mockResolvedValue(calendar);
		const result = await loadInitialContributions(loadContributions)({
			username: "torvalds",
			year: "2024",
			thisYear: CURRENT_YEAR,
		});
		expect(result.ok).toBe(true);
		expect(result.year).toBe(2024);
		if (result.ok) {
			expect(result.data.totalContributions).toBe(1234);
			expect(result.data.days).toHaveLength(53 * 7);
		}
	});

	it("passes a repository failure through as kind + status + the wording the log keeps", async () => {
		const loadContributions = vi.fn().mockResolvedValue(network("github is down"));
		const result = await loadInitialContributions(loadContributions)({ username: "torvalds", thisYear: CURRENT_YEAR });
		expect(result).toEqual({ ok: false, year: CURRENT_YEAR, kind: "Network", status: 502, reason: "github is down" });
	});

	it("chooses the Year the client's resolveYear would, so a server render and a client render agree", async () => {
		const loadContributions = vi.fn().mockResolvedValue(calendar);
		const load = loadInitialContributions(loadContributions);
		const chosen = async (year: string | null): Promise<number> =>
			(await load({ username: "torvalds", year, thisYear: CURRENT_YEAR })).year;

		expect(await chosen(String(MIN_YEAR))).toBe(MIN_YEAR);
		expect(await chosen("-5")).toBe(CURRENT_YEAR);
		expect(await chosen(String(MIN_YEAR - 1))).toBe(CURRENT_YEAR);
		expect(await chosen(String(CURRENT_YEAR + 1))).toBe(CURRENT_YEAR);
		expect(await chosen("2020.5")).toBe(CURRENT_YEAR);
		expect(await chosen(null)).toBe(CURRENT_YEAR);
		expect(loadContributions).toHaveBeenCalledWith(
			expect.objectContaining({ year: expect.objectContaining({ value: MIN_YEAR }) }),
		);
	});

	it("bounds the Year by the year its caller read off the clock", async () => {
		const loadContributions = vi.fn().mockResolvedValue(calendar);
		const load = loadInitialContributions(loadContributions);

		expect((await load({ username: "torvalds", year: "2030", thisYear: 2031 })).year).toBe(2030);
		expect((await load({ username: "torvalds", year: "2031", thisYear: 2030 })).year).toBe(2030);
		expect((await load({ username: "torvalds", thisYear: 2031 })).year).toBe(2031);
	});

	it("keeps the Year it chose when the fetch fails, so the error state covers the Year asked for", async () => {
		const loadContributions = vi.fn().mockResolvedValue(network("github is down"));
		const result = await loadInitialContributions(loadContributions)({
			username: "torvalds",
			year: "2010",
			thisYear: CURRENT_YEAR,
		});

		expect(result.ok).toBe(false);
		expect(result.year).toBe(2010);
	});

	it("rejects an invalid username before calling the repository", async () => {
		const loadContributions = vi.fn();
		const result = await loadInitialContributions(loadContributions)({ username: "a b c!", thisYear: CURRENT_YEAR });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.kind).toBe("InvalidInput");
		expect(loadContributions).not.toHaveBeenCalled();
	});
});

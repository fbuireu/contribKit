import type { ContributionDay } from "@domain/entities/types";
import { getWeekday } from "@domain/services/dates";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { generateData } from "./calendar";

describe("generateData", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 8, 30, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("hands back readonly days", () => {
		expectTypeOf(generateData()).toEqualTypeOf<readonly ContributionDay[]>();
	});

	it("is deterministic and produces a full grid", () => {
		expect(generateData(7)).toEqual(generateData(7));
		expect(generateData(7)).toHaveLength(53 * 7);
	});

	it("ends on the Saturday of the current week, so the placeholder rolls with today", () => {
		const days = generateData(7);

		expect(getWeekday(days[0].date)).toBe(0);
		expect(days.at(-1)?.date).toBe("2026-10-03");
	});

	it("gives every day a real count that agrees with its level", () => {
		const days = generateData(7);
		expect(days.every((day) => day.count !== null)).toBe(true);
		expect(days.every((day) => (day.count === 0) === (day.level === 0))).toBe(true);
		expect(days.some((day) => day.level === 0)).toBe(true);
		expect(days.some((day) => day.level > 0)).toBe(true);
	});
});

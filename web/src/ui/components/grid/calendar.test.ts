import { describe, expect, it } from "vitest";
import { generateData, summarize } from "./calendar";

describe("summarize", () => {
	it("totals counts and computes trailing streak + longest run", () => {
		const summary = summarize([
			{ date: "2024-01-01", level: 1, count: 2 },
			{ date: "2024-01-02", level: 0, count: 0 },
			{ date: "2024-01-03", level: 2, count: 3 },
			{ date: "2024-01-04", level: 1, count: 1 },
		]);
		expect(summary.count).toBe(6);
		expect(summary.streak).toBe(2);
		expect(summary.longest).toBe(2);
	});
});

describe("generateData", () => {
	it("is deterministic and produces a full grid", () => {
		expect(generateData(7)).toEqual(generateData(7));
		expect(generateData(7)).toHaveLength(53 * 7);
	});
});

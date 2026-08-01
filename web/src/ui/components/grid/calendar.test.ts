import { describe, expect, it } from "vitest";
import { generateData } from "./calendar";

describe("generateData", () => {
	it("is deterministic and produces a full grid", () => {
		expect(generateData(7)).toEqual(generateData(7));
		expect(generateData(7)).toHaveLength(53 * 7);
	});

	it("gives every day a real count that agrees with its level", () => {
		const days = generateData(7);
		expect(days.every((cell) => cell.count !== null)).toBe(true);
		expect(days.every((cell) => (cell.count === 0) === (cell.level === 0))).toBe(true);
		expect(days.some((cell) => cell.level === 0)).toBe(true);
		expect(days.some((cell) => cell.level > 0)).toBe(true);
	});
});

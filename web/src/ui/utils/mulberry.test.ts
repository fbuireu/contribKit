import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry";

describe("mulberry32", () => {
	it("is deterministic for the same seed", () => {
		const first = mulberry32(7);
		const second = mulberry32(7);
		expect([first(), first(), first()]).toEqual([second(), second(), second()]);
	});

	it("returns values in [0, 1)", () => {
		const rand = mulberry32(42);
		for (let index = 0; index < 1000; index++) {
			const value = rand();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it("advances the sequence on each call", () => {
		const rand = mulberry32(1);
		expect(rand()).not.toBe(rand());
	});

	it("produces different sequences for different seeds", () => {
		expect(mulberry32(1)()).not.toBe(mulberry32(2)());
	});
});

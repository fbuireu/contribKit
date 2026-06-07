import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry";

describe("mulberry32", () => {
	it("is deterministic for the same seed", () => {
		const a = mulberry32(7);
		const b = mulberry32(7);
		expect([a(), a(), a()]).toEqual([b(), b(), b()]);
	});

	it("returns values in [0, 1)", () => {
		const rand = mulberry32(42);
		for (let i = 0; i < 1000; i++) {
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

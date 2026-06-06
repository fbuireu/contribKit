import { describe, expect, it } from "vitest";
import { decrypt, type ShuffledData } from "./crypto";

describe("decrypt", () => {
	it("reorders shuffled letters by their order field", () => {
		const data: ShuffledData[] = [
			{ letter: "l", order: 2 },
			{ letter: "H", order: 0 },
			{ letter: "i", order: 3 },
			{ letter: "e", order: 1 },
		];
		expect(decrypt(data)).toBe("Heli");
	});

	it("preserves spaces and punctuation", () => {
		const data: ShuffledData[] = [
			{ letter: "b", order: 2 },
			{ letter: " ", order: 1 },
			{ letter: "a", order: 0 },
		];
		expect(decrypt(data)).toBe("a b");
	});

	it("does not mutate the input array", () => {
		const data: ShuffledData[] = [
			{ letter: "b", order: 1 },
			{ letter: "a", order: 0 },
		];
		decrypt(data);
		expect(data.map((part) => part.letter)).toEqual(["b", "a"]);
	});

	it("returns an empty string for empty input", () => {
		expect(decrypt([])).toBe("");
	});
});

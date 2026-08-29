import { describe, expect, it } from "vitest";
import { FailureKind, isFailure } from "../failures/failure";
import { colorOrThrow, isColor, parseColor } from "./color";
import { PALETTES } from "./palette";

describe("parseColor", () => {
	it("accepts the six and eight digit forms, with or without the hash", () => {
		for (const raw of ["#0d1117", "0d1117", "#0D1117FF", "0d1117ff"]) {
			expect(isColor(parseColor(raw)), raw).toBe(true);
		}
	});

	it("normalises to a leading hash, so two spellings of one colour are one value", () => {
		const withHash = parseColor("#0d1117");
		const without = parseColor("0d1117");

		expect(isColor(withHash) && isColor(without) && withHash.hex === without.hex).toBe(true);
	});

	it("rejects anything that could break out of a fill attribute", () => {
		for (const raw of ['#0d1117" onload=x', "red", "#zzzzzz", "#0d11", "", "url(evil)"]) {
			const parsed = parseColor(raw);

			expect(isFailure(parsed) && parsed.kind === FailureKind.InvalidInput, raw).toBe(true);
		}
	});
});

describe("every shipped Palette colour is a Color", () => {
	it("parses shared/palettes.json at module load, so a malformed token cannot reach an SVG", () => {
		for (const palette of Object.values(PALETTES)) {
			for (const color of palette.colors) {
				expect(isColor(color), `${palette.key}: ${JSON.stringify(color)}`).toBe(true);
				expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
			}
		}
	});

	it("throws rather than shipping an unparseable token, which is what the app already did", () => {
		expect(() => colorOrThrow("not a colour")).toThrow(/Invalid hex color/);
	});
});

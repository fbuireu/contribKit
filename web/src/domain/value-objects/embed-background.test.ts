import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_COLOR, embedBackgroundOrThrow, isEmbedBackground } from "./embed-background";

describe("isEmbedBackground", () => {
	it("accepts what the SVG route may be handed, and nothing that could break out of an attribute", () => {
		for (const accepted of ["transparent", "#0d1117", "#fff", "#0d1117ff", "rebeccapurple"]) {
			expect(isEmbedBackground(accepted), accepted).toBe(true);
		}
		for (const rejected of ['"', "'", "<script>", '#0d1117" onload=x', "url(evil)", ""]) {
			expect(isEmbedBackground(rejected), rejected).toBe(false);
		}
	});

	it("rejects a value that is not text", () => {
		for (const rejected of [null, undefined, 0, {}]) {
			expect(isEmbedBackground(rejected)).toBe(false);
		}
	});
});

describe("embedBackgroundOrThrow", () => {
	it("hands an accepted background back and throws on a refused one", () => {
		expect(embedBackgroundOrThrow("#0d1117")).toBe("#0d1117");
		expect(() => embedBackgroundOrThrow('"onload=x')).toThrow(/Invalid embed background/);
	});

	it("keeps transparent as the default, the absence of a rect", () => {
		expect(DEFAULT_BACKGROUND_COLOR).toBe("transparent");
	});
});

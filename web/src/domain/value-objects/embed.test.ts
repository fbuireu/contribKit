import { describe, expect, it } from "vitest";
import { DEFAULT_CELL_SHAPE } from "./cell-shape";
import { buildEmbedUrl, EMBED_BACKGROUND_PATTERN, EMBED_ROUTE, EmbedParam } from "./embed";
import { DEFAULT_PALETTE_KEY } from "./palette";

describe("EMBED_ROUTE", () => {
	it("matches the path buildEmbedUrl produces", () => {
		expect(EMBED_ROUTE.test(new URL(buildEmbedUrl({ username: "torvalds" })).pathname)).toBe(true);
	});

	it("still matches once the query carries every option", () => {
		const url = new URL(buildEmbedUrl({ username: "torvalds", palette: "dracula", shape: "hex" }));

		expect(EMBED_ROUTE.test(url.pathname)).toBe(true);
	});

	it("does not match a nested path", () => {
		expect(EMBED_ROUTE.test("/user/torvalds/extra.svg")).toBe(false);
	});
});

describe("buildEmbedUrl", () => {
	it("omits the query when every option is the default", () => {
		expect(
			buildEmbedUrl({
				username: "torvalds",
				palette: DEFAULT_PALETTE_KEY,
				shape: DEFAULT_CELL_SHAPE,
			}),
		).toBe("https://contribkit.app/user/torvalds.svg");
	});

	it("omits the query when no option is given", () => {
		expect(buildEmbedUrl({ username: "torvalds" })).toBe("https://contribkit.app/user/torvalds.svg");
	});

	it("separates the first option with ? and the rest with a single &", () => {
		const url = buildEmbedUrl({ username: "torvalds", palette: "catppuccin", shape: "hex" });

		expect(url).toBe("https://contribkit.app/user/torvalds.svg?palette=catppuccin&shape=hex");
		expect(url).not.toContain("&&");
		expect(url).not.toContain("?&");
	});

	it("never emits a doubled separator for any combination of options", () => {
		const values = [undefined, "catppuccin"];
		const shapes = [undefined, "hex"];

		for (const palette of values) {
			for (const shape of shapes) {
				const url = buildEmbedUrl({ username: "torvalds", palette, shape });
				expect(url).not.toContain("&&");
				expect(url).not.toContain("?&");
				expect(new URL(url).pathname).toBe("/user/torvalds.svg");
			}
		}
	});

	it("never emits a background, because nothing on the web chooses one", () => {
		const url = buildEmbedUrl({ username: "torvalds", palette: "nord", shape: "hex", keepDefaults: true });

		expect(url).not.toContain(EmbedParam.Background);
	});
});

describe("EMBED_BACKGROUND_PATTERN", () => {
	it("accepts what the SVG route may be handed, and nothing that could break out of an attribute", () => {
		for (const accepted of ["transparent", "#0d1117", "#fff", "#0d1117ff", "rebeccapurple"]) {
			expect(EMBED_BACKGROUND_PATTERN.test(accepted), accepted).toBe(true);
		}
		for (const rejected of ['"', "'", "<script>", '#0d1117" onload=x', "url(evil)", ""]) {
			expect(EMBED_BACKGROUND_PATTERN.test(rejected), rejected).toBe(false);
		}
	});
});

import { describe, expect, it } from "vitest";
import { DEFAULT_CELL_SHAPE } from "./cell-shape";
import { buildEmbedUrl, DEFAULT_EMBED_QUERY, EMBED_BACKGROUND_PATTERN, EMBED_ROUTE } from "./embed";
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
				background: DEFAULT_EMBED_QUERY.background,
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
		const backgrounds = [undefined, "#0d1117"];

		for (const palette of values) {
			for (const shape of shapes) {
				for (const background of backgrounds) {
					const url = buildEmbedUrl({ username: "torvalds", palette, shape, background });
					expect(url).not.toContain("&&");
					expect(url).not.toContain("?&");
					expect(new URL(url).pathname).toBe("/user/torvalds.svg");
				}
			}
		}
	});

	it("percent-encodes a background so the query stays parseable", () => {
		const url = buildEmbedUrl({ username: "torvalds", background: "#0d1117" });

		expect(new URL(url).searchParams.get("background")).toBe("#0d1117");
	});

	it("round-trips through the pattern the route validates with", () => {
		const url = buildEmbedUrl({ username: "torvalds", background: "#0d1117" });
		const background = new URL(url).searchParams.get("background") ?? "";

		expect(EMBED_BACKGROUND_PATTERN.test(background)).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import { isFailure } from "../failures/failure";
import { CellShape, DEFAULT_CELL_SHAPE } from "./cell-shape";
import { buildEmbedUrl, EMBED_ROUTE, EmbedParam } from "./embed";
import { DEFAULT_PALETTE_KEY } from "./palette";
import { parseUsername, type Username } from "./username";

const usernameOf = (raw: string): Username => {
	const parsed = parseUsername(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a Username: ${raw}`);
	return parsed;
};

describe("EMBED_ROUTE", () => {
	it("matches the path buildEmbedUrl produces", () => {
		expect(
			EMBED_ROUTE.test(
				new URL(
					buildEmbedUrl({ username: usernameOf("torvalds"), palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE }),
				).pathname,
			),
		).toBe(true);
	});

	it("still matches once the query carries every option", () => {
		const url = new URL(buildEmbedUrl({ username: usernameOf("torvalds"), palette: "dracula", shape: "hex" }));

		expect(EMBED_ROUTE.test(url.pathname)).toBe(true);
	});

	it("does not match a nested path", () => {
		expect(EMBED_ROUTE.test("/user/torvalds/extra.svg")).toBe(false);
	});
});

describe("buildEmbedUrl", () => {
	it("writes the Username the value object holds into the path", () => {
		expect(
			buildEmbedUrl({ username: usernameOf("a--b"), palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE }),
		).toBe("https://contribkit.app/user/a--b.svg");
	});

	it("omits the query when every option is the default", () => {
		expect(
			buildEmbedUrl({
				username: usernameOf("torvalds"),
				palette: DEFAULT_PALETTE_KEY,
				shape: DEFAULT_CELL_SHAPE,
			}),
		).toBe("https://contribkit.app/user/torvalds.svg");
	});

	it("separates the first option with ? and the rest with a single &", () => {
		const url = buildEmbedUrl({ username: usernameOf("torvalds"), palette: "catppuccin", shape: "hex" });

		expect(url).toBe("https://contribkit.app/user/torvalds.svg?palette=catppuccin&shape=hex");
		expect(url).not.toContain("&&");
		expect(url).not.toContain("?&");
	});

	it("never emits a doubled separator for any combination of options", () => {
		const values = [DEFAULT_PALETTE_KEY, "catppuccin"];
		const shapes: CellShape[] = [DEFAULT_CELL_SHAPE, CellShape.Hex];

		for (const palette of values) {
			for (const shape of shapes) {
				const url = buildEmbedUrl({ username: usernameOf("torvalds"), palette, shape });
				expect(url).not.toContain("&&");
				expect(url).not.toContain("?&");
				expect(new URL(url).pathname).toBe("/user/torvalds.svg");
			}
		}
	});

	it("never emits a background, because nothing on the web chooses one", () => {
		const url = buildEmbedUrl({ username: usernameOf("torvalds"), palette: "nord", shape: "hex" });

		expect(url).not.toContain(EmbedParam.Background);
	});
});

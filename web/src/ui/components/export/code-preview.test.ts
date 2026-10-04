// @vitest-environment happy-dom

import { GRID_CELL_COUNT } from "@domain/services/dates";
import { cornerRadiusFor, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { CELL_SHAPES, CellShape, DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { buildEmbedUrl } from "@domain/value-objects/embed";
import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { buildCodeBlock, buildMarkdownLines, buildSvgLines, markdownSnippet } from "./code-preview";

type Lines = ReturnType<typeof buildMarkdownLines>;

const toText = (lines: Lines): string => lines.map((line) => line.map(([, text]) => text).join("")).join("\n");

describe("markdownSnippet", () => {
	it("wraps the svg url in a markdown image", () => {
		expect(markdownSnippet({ username: "torvalds" })).toBe(
			"![contributions](https://contribkit.app/user/torvalds.svg)",
		);
	});

	it("carries the chosen palette and shape, so copying preserves the customization", () => {
		expect(markdownSnippet({ username: "torvalds", palette: "catppuccin", shape: CellShape.Hex })).toBe(
			"![contributions](https://contribkit.app/user/torvalds.svg?palette=catppuccin&shape=hex)",
		);
	});
});

const GITHUB = PALETTES.github.colors;
const SVG_LINES = buildSvgLines({ palette: GITHUB, shape: DEFAULT_CELL_SHAPE });

describe("buildSvgLines", () => {
	it("derives the viewBox from the grid geometry", () => {
		expect(toText(SVG_LINES)).toContain('viewBox="0 0 636 84"');
	});

	it("uses github palette colors for the sample rects", () => {
		expect(toText(SVG_LINES)).toContain(PALETTES.github.colors[1].hex);
	});

	it("accounts for every remaining grid cell in the ellipsis comment", () => {
		expect(toText(SVG_LINES)).toContain(`${GRID_CELL_COUNT - 3} more cells`);
	});
});

describe("every Cell Shape draws its own preview", () => {
	const tagFor = (shape: CellShape): string =>
		buildSvgLines({ palette: GITHUB, shape })
			.flat()
			.map(([, text]) => text)
			.join("")
			.match(/<(circle|polygon|rect)/)?.[1] ?? "none";

	it("never falls through to a rect for a shape it does not know", () => {
		expect(
			Object.fromEntries(CELL_SHAPES.map((shape) => [shape, tagFor(shape)])),
			"a shape that falls through to a rect shows rects while the clipboard gets its real markup",
		).toEqual({
			square: "rect",
			rounded: "rect",
			circle: "circle",
			dot: "circle",
			hex: "polygon",
		});
	});
});

describe("buildMarkdownLines", () => {
	it("shows the one snippet markdownSnippet copies and nothing else, whichever options are at their defaults", () => {
		for (const params of [
			{ username: "torvalds", palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE },
			{ username: "torvalds", palette: "nord", shape: DEFAULT_CELL_SHAPE },
			{ username: "torvalds", palette: "catppuccin", shape: CellShape.Hex },
		]) {
			expect(toText(buildMarkdownLines(params)), JSON.stringify(params)).toBe(markdownSnippet(params));
		}
	});

	it("embeds the username, palette and shape", () => {
		const text = toText(buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: CellShape.Hex }));
		expect(text).toContain(buildEmbedUrl({ username: "torvalds" }));
		expect(text).toContain("catppuccin");
		expect(text).toContain("hex");
	});

	it("never emits a doubled query separator", () => {
		const text = toText(buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: CellShape.Hex }));
		expect(text).not.toContain("&&");
		expect(text).not.toContain("?&");
	});

	it("keeps the markdown image on one line, so the snippet pastes as a link", () => {
		const lines = buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: CellShape.Hex });

		expect(lines).toHaveLength(1);
		expect(toText(lines).startsWith("![contributions](")).toBe(true);
		expect(toText(lines).endsWith(")")).toBe(true);
	});
});

describe("buildCodeBlock", () => {
	it("renders one div per line inside a pre.code", () => {
		const pre = buildCodeBlock(SVG_LINES);
		expect(pre.className).toBe("code");
		expect(pre.querySelectorAll(".code-line")).toHaveLength(SVG_LINES.length);
	});

	it("renders a non-breaking space for empty lines", () => {
		const pre = buildCodeBlock([[]]);
		expect(pre.querySelector(".code-line")?.innerHTML).toBe("&nbsp;");
	});
});

describe("the SVG preview shows what the copy button copies", () => {
	const NORD = PALETTES.nord.colors;

	it("draws the visitor's Palette, not the default one", () => {
		const text = toText(buildSvgLines({ palette: NORD, shape: DEFAULT_CELL_SHAPE }));

		expect(text).toContain(NORD[4].hex);
		expect(text).not.toContain(PALETTES.github.colors[4].hex);
	});

	it("squares a square, rather than rounding it like the default", () => {
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Square }))).toContain('rx="0"');
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Rounded }))).not.toContain('rx="0"');
	});

	it("takes its corner radius from the geometry every renderer shares", () => {
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Rounded }))).toContain(
			`rx="${cornerRadiusFor(SVG_DEFAULT_CELL_SIZE)}"`,
		);
	});
});

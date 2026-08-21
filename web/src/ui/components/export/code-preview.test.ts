// @vitest-environment happy-dom

import { GRID_CELL_COUNT } from "@domain/services/dates";
import { cornerRadiusFor, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { CellShape, DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { buildEmbedUrl, EmbedParam } from "@domain/value-objects/embed";
import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { buildCodeBlock, buildMarkdownLines, buildSvgLines, markdownSnippet } from "./code-preview";

type Lines = ReturnType<typeof buildMarkdownLines>;

const toText = (lines: Lines): string => lines.map((line) => line.map(([, text]) => text).join("")).join("\n");

describe("the embed url the snippets carry", () => {
	it("builds the public svg url for a username", () => {
		expect(buildEmbedUrl({ username: "torvalds" })).toBe("https://contribkit.app/user/torvalds.svg");
	});
});

describe("markdownSnippet", () => {
	it("wraps the svg url in a markdown image", () => {
		expect(markdownSnippet({ username: "torvalds" })).toBe(
			"![contributions](https://contribkit.app/user/torvalds.svg)",
		);
	});

	it("carries the chosen palette and shape, so copying preserves the customization", () => {
		expect(markdownSnippet({ username: "torvalds", palette: "catppuccin", shape: "hex" })).toBe(
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
		expect(toText(SVG_LINES)).toContain(PALETTES.github.colors[1]);
	});

	it("accounts for every remaining grid cell in the ellipsis comment", () => {
		expect(toText(SVG_LINES)).toContain(`${GRID_CELL_COUNT - 3} more cells`);
	});
});

describe("buildMarkdownLines", () => {
	it("embeds the username, palette and shape", () => {
		const text = toText(buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: "hex" }));
		expect(text).toContain(buildEmbedUrl({ username: "torvalds" }));
		expect(text).toContain("catppuccin");
		expect(text).toContain("hex");
	});

	it("never emits a doubled query separator", () => {
		const text = toText(buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: "hex" }));
		expect(text).not.toContain("&&");
		expect(text).not.toContain("?&");
	});

	it("keeps each markdown image on one line, so the snippet pastes as a link", () => {
		const lines = buildMarkdownLines({ username: "torvalds", palette: "catppuccin", shape: "hex" });
		const images = lines.filter((line) => line.some(([, text]) => text === "!["));

		expect(images).toHaveLength(2);
		for (const image of images) {
			const text = image.map(([, value]) => value).join("");
			expect(text.startsWith("![contributions](")).toBe(true);
			expect(text.endsWith(")")).toBe(true);
		}
	});

	it("shows exactly what markdownSnippet copies", () => {
		const params = { username: "torvalds", palette: "catppuccin", shape: "hex" };
		const shown = buildMarkdownLines(params)
			.map((line) => line.map(([, text]) => text).join(""))
			.filter((line) => line.startsWith("!["));

		expect(shown).toContain(markdownSnippet(params));
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

describe("buildMarkdownLines with the defaults the page opens on", () => {
	it("does not print the same line twice", () => {
		const lines = buildMarkdownLines({ username: "torvalds", palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE })
			.map((line) => line.map(([, text]) => text).join(""))
			.filter((line) => line.startsWith("!["));

		expect(new Set(lines).size).toBe(lines.length);
	});

	it("shows the options on the line that says it has options", () => {
		const lines = buildMarkdownLines({ username: "torvalds", palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE })
			.map((line) => line.map(([, text]) => text).join(""))
			.filter((line) => line.startsWith("!["));

		expect(lines[1]).toContain(`?${EmbedParam.Palette}=`);
		expect(lines[1]).toContain(`&${EmbedParam.Shape}=`);
	});
});

describe("the SVG preview shows what the copy button copies", () => {
	const NORD = PALETTES.nord.colors;

	it("draws the visitor's Palette, not the default one", () => {
		const text = toText(buildSvgLines({ palette: NORD, shape: DEFAULT_CELL_SHAPE }));

		expect(text).toContain(NORD[4]);
		expect(text).not.toContain(PALETTES.github.colors[4]);
	});

	it("draws the visitor's Cell Shape, not always a rect", () => {
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Hex }))).toContain("<polygon ");
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Circle }))).toContain("<circle ");
		expect(toText(buildSvgLines({ palette: NORD, shape: CellShape.Square }))).toContain("<rect ");
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

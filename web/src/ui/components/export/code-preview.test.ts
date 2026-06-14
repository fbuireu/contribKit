// @vitest-environment happy-dom

import { GRID_CELL_COUNT } from "@domain/services/dates";
import { PALETTES } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { buildCodeBlock, buildMarkdownLines, markdownSnippet, SVG_LINES, userSvgUrl } from "./code-preview";

type Lines = ReturnType<typeof buildMarkdownLines>;

const toText = (lines: Lines): string => lines.map((line) => line.map(([, text]) => text).join("")).join("\n");

describe("userSvgUrl", () => {
	it("builds the public svg url for a username", () => {
		expect(userSvgUrl("torvalds")).toBe("https://contribkit.app/user/torvalds.svg");
	});
});

describe("markdownSnippet", () => {
	it("wraps the svg url in a markdown image", () => {
		expect(markdownSnippet("torvalds")).toBe("![contributions](https://contribkit.app/user/torvalds.svg)");
	});
});

describe("SVG_LINES", () => {
	it("derives the viewBox from the grid geometry", () => {
		expect(toText(SVG_LINES)).toContain('viewBox="0 0 636 84"');
	});

	it("uses github palette colors for the sample rects", () => {
		expect(toText(SVG_LINES)).toContain(PALETTES.github.colors[1]);
	});

	it("accounts for every remaining grid cell in the ellipsis comment", () => {
		expect(toText(SVG_LINES)).toContain(`${GRID_CELL_COUNT - 3} more rects`);
	});
});

describe("buildMarkdownLines", () => {
	it("embeds the username, palette and shape", () => {
		const text = toText(buildMarkdownLines({ username: "torvalds", palette: "github", shape: "hex" }));
		expect(text).toContain(userSvgUrl("torvalds"));
		expect(text).toContain("github");
		expect(text).toContain("hex");
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

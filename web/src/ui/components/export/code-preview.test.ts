// @vitest-environment happy-dom

import { contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { cornerRadiusFor, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { CELL_SHAPES, CellShape, DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { buildEmbedUrl } from "@domain/value-objects/embed";
import { DEFAULT_PALETTE_KEY, PALETTES, type PaletteColors } from "@domain/value-objects/palette";
import { parseUsername, type Username } from "@domain/value-objects/username";
import { describe, expect, it } from "vitest";
import { EXPORT_GRID_GEOMETRY } from "../grid/grid-geometry";
import { renderCalendarString } from "../grid/render-svg";
import { buildCodeBlock, buildMarkdownLines, buildSvgLines, markdownSnippet } from "./code-preview";

const usernameOf = (raw: string): Username => {
	const parsed = parseUsername(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a Username: ${raw}`);
	return parsed;
};

type Lines = ReturnType<typeof buildMarkdownLines>;

const toText = (lines: Lines): string => lines.map((line) => line.map(([, text]) => text).join("")).join("\n");

describe("markdownSnippet", () => {
	it("wraps the svg url in a markdown image", () => {
		expect(markdownSnippet({ username: usernameOf("torvalds") })).toBe(
			"![contributions](https://contribkit.app/user/torvalds.svg)",
		);
	});

	it("carries the chosen palette and shape, so copying preserves the customization", () => {
		expect(markdownSnippet({ username: usernameOf("torvalds"), palette: "catppuccin", shape: CellShape.Hex })).toBe(
			"![contributions](https://contribkit.app/user/torvalds.svg?palette=catppuccin&shape=hex)",
		);
	});
});

const GITHUB = PALETTES.github.colors;
const NORD = PALETTES.nord.colors;

const levelledYear = (year: number): readonly ContributionDay[] =>
	buildGridFromApi({ days: [], year }).map(({ date }, index) => {
		const built = contributionDay({ date, level: index % 5, count: index % 5 === 0 ? 0 : index });
		if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${date}`);
		return built;
	});

interface CopiedSvgParams {
	year: number;
	palette?: PaletteColors;
	shape?: CellShape;
}

const copiedSvg = ({ year, palette = GITHUB, shape = DEFAULT_CELL_SHAPE }: CopiedSvgParams): string =>
	renderCalendarString({ days: levelledYear(year), palette, shape, ...EXPORT_GRID_GEOMETRY, showLabels: false });

const lineTexts = (lines: Lines): string[] => lines.map((line) => line.map(([, text]) => text).join(""));

const ELISION = /^<!-- … (\d+) more cells … -->$/;
const cellsIn = (markup: string): number => (markup.match(/data-date=/g) ?? []).length;

interface SplitPreview {
	head: string;
	omitted: number;
	tail: string;
}

const splitPreview = (lines: Lines): SplitPreview => {
	const texts = lineTexts(lines);
	const at = texts.findIndex((text) => ELISION.test(text));
	return {
		head: texts.slice(0, at).join(""),
		omitted: Number(ELISION.exec(texts[at])?.[1]),
		tail: texts.slice(at + 1).join(""),
	};
};

const SVG_LINES = buildSvgLines(copiedSvg({ year: 2024 }));

describe("buildSvgLines", () => {
	const years = [2024, 2028] as const;

	it("opens with the opening tag of the markup the copy button copies, whichever Cell Shape draws it", () => {
		for (const year of years) {
			for (const shape of CELL_SHAPES) {
				const copied = copiedSvg({ year, shape });

				expect(lineTexts(buildSvgLines(copied))[0], `${year} ${shape}`).toBe(/^<svg[^>]*>/.exec(copied)?.[0]);
			}
		}
	});

	it("carries the viewBox of the calendar on screen: 53 weeks of padding and Cells, or 54", () => {
		expect(lineTexts(SVG_LINES)[0]).toContain('viewBox="0 0 660 108"');
		expect(lineTexts(buildSvgLines(copiedSvg({ year: 2028 })))[0]).toContain('viewBox="0 0 672 108"');
	});

	it("shows the start and the end of the copied markup, with the Cells between them counted", () => {
		for (const year of years) {
			for (const shape of CELL_SHAPES) {
				const copied = copiedSvg({ year, shape });
				const { head, omitted, tail } = splitPreview(buildSvgLines(copied));

				expect(copied.startsWith(head), `${year} ${shape} head`).toBe(true);
				expect(copied.endsWith(tail), `${year} ${shape} tail`).toBe(true);
				expect(cellsIn(head), `${year} ${shape} head cells`).toBe(3);
				expect(omitted, `${year} ${shape} omitted`).toBe(
					cellsIn(copied.slice(head.length, copied.length - tail.length)),
				);
				expect(cellsIn(head) + omitted, `${year} ${shape} all cells`).toBe(cellsIn(copied));
			}
		}
	});

	it("counts every Cell of a 54 week year, not the 53 week window", () => {
		expect(splitPreview(buildSvgLines(copiedSvg({ year: 2024 }))).omitted).toBe(53 * 7 - 3);
		expect(splitPreview(buildSvgLines(copiedSvg({ year: 2028 }))).omitted).toBe(54 * 7 - 3);
	});

	it("puts one element on each line, so the preview reads as code", () => {
		const texts = lineTexts(SVG_LINES);

		expect(texts).toHaveLength(8);
		for (const text of texts) expect(text).toMatch(/^<[^>]+>$/);
	});

	it("shows a few Cells whole, and says nothing of Cells it did not leave out", () => {
		const two =
			'<svg xmlns="http://www.w3.org/2000/svg"><g><rect x="0" data-date="2024-01-01"/><rect x="12" data-date="2024-01-02"/></g></svg>';

		expect(lineTexts(buildSvgLines(two)).join("")).toBe(two);
	});

	it("shows markup that has no Cells exactly as it is", () => {
		const bare = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

		expect(lineTexts(buildSvgLines(bare)).join("")).toBe(bare);
	});

	it("keeps the text between elements, rather than dropping it", () => {
		expect(lineTexts(buildSvgLines('<svg><text x="1">Jan</text></svg>'))).toEqual([
			"<svg>",
			'<text x="1">',
			"Jan",
			"</text>",
			"</svg>",
		]);
	});

	it("colours tags, attribute names and values apart", () => {
		expect(SVG_LINES[0].slice(0, 4)).toEqual([
			["c-tag", "<svg "],
			["c-attr", "xmlns"],
			["", "="],
			["c-str", '"http://www.w3.org/2000/svg"'],
		]);
		expect(SVG_LINES.at(-1)).toEqual([["c-tag", "</svg>"]]);
	});

	it("marks the Cells it leaves out as a comment", () => {
		const elision = SVG_LINES.find((line) => ELISION.test(line.map(([, text]) => text).join("")));

		expect(elision?.map(([className]) => className)).toEqual(["c-comment"]);
	});
});

describe("every Cell Shape draws its own preview", () => {
	const tagFor = (shape: CellShape): string =>
		lineTexts(buildSvgLines(copiedSvg({ year: 2024, shape })))[2].match(/^<(circle|polygon|rect)/)?.[1] ?? "none";

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
			{ username: usernameOf("torvalds"), palette: DEFAULT_PALETTE_KEY, shape: DEFAULT_CELL_SHAPE },
			{ username: usernameOf("torvalds"), palette: "nord", shape: DEFAULT_CELL_SHAPE },
			{ username: usernameOf("torvalds"), palette: "catppuccin", shape: CellShape.Hex },
		]) {
			expect(toText(buildMarkdownLines(params)), JSON.stringify(params)).toBe(markdownSnippet(params));
		}
	});

	it("embeds the username, palette and shape", () => {
		const text = toText(
			buildMarkdownLines({ username: usernameOf("torvalds"), palette: "catppuccin", shape: CellShape.Hex }),
		);
		expect(text).toContain(buildEmbedUrl({ username: usernameOf("torvalds") }));
		expect(text).toContain("catppuccin");
		expect(text).toContain("hex");
	});

	it("never emits a doubled query separator", () => {
		const text = toText(
			buildMarkdownLines({ username: usernameOf("torvalds"), palette: "catppuccin", shape: CellShape.Hex }),
		);
		expect(text).not.toContain("&&");
		expect(text).not.toContain("?&");
	});

	it("keeps the markdown image on one line, so the snippet pastes as a link", () => {
		const lines = buildMarkdownLines({ username: usernameOf("torvalds"), palette: "catppuccin", shape: CellShape.Hex });

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
	it("draws the visitor's Palette, not the default one", () => {
		const text = lineTexts(buildSvgLines(copiedSvg({ year: 2024, palette: NORD }))).join("");

		expect(text).toContain(NORD[1].hex);
		expect(text).not.toContain(GITHUB[1].hex);
	});

	it("squares a square, rather than rounding it like the default", () => {
		const first = (shape: CellShape): string => lineTexts(buildSvgLines(copiedSvg({ year: 2024, shape })))[2];

		expect(first(CellShape.Square)).toContain('rx="0"');
		expect(first(CellShape.Rounded)).not.toContain('rx="0"');
		expect(first(CellShape.Rounded)).toContain(`rx="${cornerRadiusFor(SVG_DEFAULT_CELL_SIZE)}"`);
	});

	it("carries the date and the Count of each Cell it shows, as the markup it copies does", () => {
		const [, , firstCell] = lineTexts(SVG_LINES);

		expect(firstCell).toMatch(/data-date="\d{4}-\d{2}-\d{2}"/);
		expect(lineTexts(SVG_LINES)[3]).toMatch(/data-count="\d+"/);
	});
});

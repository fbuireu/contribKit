import { DAYS_PER_WEEK, GRID_CELL_COUNT, WEEKS_PER_YEAR } from "@domain/services/dates";
import {
	cornerRadiusFor,
	dotRadius,
	hexPoints,
	SVG_DEFAULT_CELL_GAP,
	SVG_DEFAULT_CELL_SIZE,
} from "@domain/services/svg-geometry";
import { CellShape } from "@domain/value-objects/cell-shape";
import { buildEmbedUrl } from "@domain/value-objects/embed";
import type { PaletteColors } from "@domain/value-objects/palette";

type Token = [string, string];
type CodeLine = Token[];

const CELL_STEP = SVG_DEFAULT_CELL_SIZE + SVG_DEFAULT_CELL_GAP;
const VIEWBOX_WIDTH = WEEKS_PER_YEAR * CELL_STEP;
const VIEWBOX_HEIGHT = DAYS_PER_WEEK * CELL_STEP;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SAMPLE_LEVELS = [1, 3, 4] as const;
const REMAINING_CELLS = GRID_CELL_COUNT - SAMPLE_LEVELS.length;
const IMAGE_ALT = "contributions";

export interface MarkdownSnippetParams {
	username: string;
	palette?: string;
	shape?: string;
}

export const markdownSnippet = ({ username, palette, shape }: MarkdownSnippetParams): string =>
	`![${IMAGE_ALT}](${buildEmbedUrl({ username, palette, shape })})`;

interface AttributeTokensParams {
	name: string;
	value: string | number;
}

const attributeTokens = ({ name, value }: AttributeTokensParams): Token[] => [
	["c-attr", name],
	["", "="],
	["c-str", `"${value}"`],
];

const joinWithSpaces = (groups: Token[][]): Token[] =>
	groups.flatMap((tokens, index) => (index === 0 ? tokens : [["", " "] as Token, ...tokens]));

interface CellLineParams {
	column: number;
	level: number;
	palette: PaletteColors;
	shape: CellShape;
}

type CellLineRenderer = (params: CellLineParams) => CodeLine;

const circleLine = ({ column, level, palette, shape }: CellLineParams): CodeLine => {
	const x = column * CELL_STEP;
	const centre = SVG_DEFAULT_CELL_SIZE / 2;

	return [
		["", " "],
		["c-tag", "<circle "],
		...joinWithSpaces([
			attributeTokens({ name: "cx", value: x + centre }),
			attributeTokens({ name: "cy", value: centre }),
			attributeTokens({
				name: "r",
				value: shape === CellShape.Dot ? dotRadius({ level, size: SVG_DEFAULT_CELL_SIZE }) : centre,
			}),
			attributeTokens({ name: "fill", value: palette[level] }),
		]),
		["c-tag", "/>"],
	];
};

const hexLine = ({ column, level, palette }: CellLineParams): CodeLine => {
	const x = column * CELL_STEP;
	const centre = SVG_DEFAULT_CELL_SIZE / 2;

	return [
		["", " "],
		["c-tag", "<polygon "],
		...joinWithSpaces([
			attributeTokens({ name: "points", value: hexPoints({ cx: x + centre, cy: centre, radius: centre }) }),
			attributeTokens({ name: "fill", value: palette[level] }),
		]),
		["c-tag", "/>"],
	];
};

const rectLine =
	(radius: number): CellLineRenderer =>
	({ column, level, palette }: CellLineParams): CodeLine => [
		["", " "],
		["c-tag", "<rect "],
		...joinWithSpaces([
			attributeTokens({ name: "x", value: column * CELL_STEP }),
			attributeTokens({ name: "y", value: 0 }),
			attributeTokens({ name: "width", value: SVG_DEFAULT_CELL_SIZE }),
			attributeTokens({ name: "height", value: SVG_DEFAULT_CELL_SIZE }),
			attributeTokens({ name: "rx", value: radius }),
			attributeTokens({ name: "fill", value: palette[level] }),
		]),
		["c-tag", "/>"],
	];

const CELL_LINE_RENDERERS: Record<CellShape, CellLineRenderer> = {
	[CellShape.Square]: rectLine(0),
	[CellShape.Rounded]: rectLine(cornerRadiusFor(SVG_DEFAULT_CELL_SIZE)),
	[CellShape.Circle]: circleLine,
	[CellShape.Dot]: circleLine,
	[CellShape.Hex]: hexLine,
};

const cellLine = (params: CellLineParams): CodeLine => CELL_LINE_RENDERERS[params.shape](params);

export interface BuildSvgLinesParams {
	palette: PaletteColors;
	shape: CellShape;
}

export const buildSvgLines = ({ palette, shape }: BuildSvgLinesParams): CodeLine[] => [
	[
		[
			"c-comment",
			`<!-- ${WEEKS_PER_YEAR} × ${DAYS_PER_WEEK} grid · cell=${SVG_DEFAULT_CELL_SIZE} · gap=${SVG_DEFAULT_CELL_GAP} -->`,
		],
	],
	[
		["c-tag", "<svg "],
		...joinWithSpaces([
			attributeTokens({ name: "viewBox", value: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}` }),
			attributeTokens({ name: "xmlns", value: SVG_NAMESPACE }),
		]),
		["c-tag", ">"],
	],
	...SAMPLE_LEVELS.map((level, column) => cellLine({ column, level, palette, shape })),
	[
		["", " "],
		["c-comment", `<!-- … ${REMAINING_CELLS} more cells … -->`],
	],
	[["c-tag", "</svg>"]],
];

export interface BuildMarkdownLinesParams {
	username: string;
	palette: string;
	shape: string;
}

const imageLine = (url: string): CodeLine => {
	const [base, query] = url.split("?");
	return [
		["c-tag", "!["],
		["c-str", IMAGE_ALT],
		["c-tag", "]("],
		["c-attr", base],
		...(query ? ([["c-str", `?${query}`]] as Token[]) : []),
		["c-tag", ")"],
	];
};

export function buildMarkdownLines({ username, palette, shape }: BuildMarkdownLinesParams): CodeLine[] {
	return [
		[["c-comment", "<!-- paste into your README -->"]],
		[],
		imageLine(buildEmbedUrl({ username })),
		[],
		[["c-comment", "<!-- or with options -->"]],
		[],
		imageLine(buildEmbedUrl({ username, palette, shape, keepDefaults: true })),
	];
}

export function buildCodeBlock(lines: CodeLine[]): HTMLPreElement {
	const pre = document.createElement("pre");
	pre.className = "code";
	lines.forEach((line) => {
		const div = document.createElement("div");
		div.className = "code-line";
		if (line.length) {
			line.forEach(([className, text]) => {
				const span = document.createElement("span");
				if (className) span.className = className;
				span.textContent = text;
				div.appendChild(span);
			});
		} else {
			div.innerHTML = "&nbsp;";
		}
		pre.appendChild(div);
	});
	return pre;
}

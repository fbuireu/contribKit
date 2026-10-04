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

const TokenClass = {
	Plain: "",
	Tag: "c-tag",
	Attribute: "c-attr",
	String: "c-str",
	Comment: "c-comment",
} as const;

type TokenClass = (typeof TokenClass)[keyof typeof TokenClass];
type Token = [TokenClass, string];
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
	shape?: CellShape;
}

interface AttributeTokensParams {
	name: string;
	value: string | number;
}

const attributeTokens = ({ name, value }: AttributeTokensParams): Token[] => [
	[TokenClass.Attribute, name],
	[TokenClass.Plain, "="],
	[TokenClass.String, `"${value}"`],
];

const joinWithSpaces = (groups: Token[][]): Token[] =>
	groups.flatMap((tokens, index) => (index === 0 ? tokens : [[TokenClass.Plain, " "] as Token, ...tokens]));

interface CellLineParams {
	weekIndex: number;
	level: number;
	palette: PaletteColors;
	shape: CellShape;
}

type CellLineRenderer = (params: CellLineParams) => CodeLine;

const circleLine = ({ weekIndex, level, palette, shape }: CellLineParams): CodeLine => {
	const x = weekIndex * CELL_STEP;
	const centre = SVG_DEFAULT_CELL_SIZE / 2;

	return [
		[TokenClass.Plain, " "],
		[TokenClass.Tag, "<circle "],
		...joinWithSpaces([
			attributeTokens({ name: "cx", value: x + centre }),
			attributeTokens({ name: "cy", value: centre }),
			attributeTokens({
				name: "r",
				value: shape === CellShape.Dot ? dotRadius({ level, size: SVG_DEFAULT_CELL_SIZE }) : centre,
			}),
			attributeTokens({ name: "fill", value: palette[level].hex }),
		]),
		[TokenClass.Tag, "/>"],
	];
};

const hexLine = ({ weekIndex, level, palette }: CellLineParams): CodeLine => {
	const x = weekIndex * CELL_STEP;
	const centre = SVG_DEFAULT_CELL_SIZE / 2;

	return [
		[TokenClass.Plain, " "],
		[TokenClass.Tag, "<polygon "],
		...joinWithSpaces([
			attributeTokens({ name: "points", value: hexPoints({ cx: x + centre, cy: centre, radius: centre }) }),
			attributeTokens({ name: "fill", value: palette[level].hex }),
		]),
		[TokenClass.Tag, "/>"],
	];
};

const rectLine =
	(radius: number): CellLineRenderer =>
	({ weekIndex, level, palette }: CellLineParams): CodeLine => [
		[TokenClass.Plain, " "],
		[TokenClass.Tag, "<rect "],
		...joinWithSpaces([
			attributeTokens({ name: "x", value: weekIndex * CELL_STEP }),
			attributeTokens({ name: "y", value: 0 }),
			attributeTokens({ name: "width", value: SVG_DEFAULT_CELL_SIZE }),
			attributeTokens({ name: "height", value: SVG_DEFAULT_CELL_SIZE }),
			attributeTokens({ name: "rx", value: radius }),
			attributeTokens({ name: "fill", value: palette[level].hex }),
		]),
		[TokenClass.Tag, "/>"],
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
			TokenClass.Comment,
			`<!-- ${WEEKS_PER_YEAR} × ${DAYS_PER_WEEK} grid · cell=${SVG_DEFAULT_CELL_SIZE} · gap=${SVG_DEFAULT_CELL_GAP} -->`,
		],
	],
	[
		[TokenClass.Tag, "<svg "],
		...joinWithSpaces([
			attributeTokens({ name: "viewBox", value: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}` }),
			attributeTokens({ name: "xmlns", value: SVG_NAMESPACE }),
		]),
		[TokenClass.Tag, ">"],
	],
	...SAMPLE_LEVELS.map((level, weekIndex) => cellLine({ weekIndex, level, palette, shape })),
	[
		[TokenClass.Plain, " "],
		[TokenClass.Comment, `<!-- … ${REMAINING_CELLS} more cells … -->`],
	],
	[[TokenClass.Tag, "</svg>"]],
];

const imageLine = (url: string): CodeLine => {
	const [base, query] = url.split("?");
	return [
		[TokenClass.Tag, "!["],
		[TokenClass.String, IMAGE_ALT],
		[TokenClass.Tag, "]("],
		[TokenClass.Attribute, base],
		...(query ? ([[TokenClass.String, `?${query}`]] as Token[]) : []),
		[TokenClass.Tag, ")"],
	];
};

const snippetLine = ({ username, palette, shape }: MarkdownSnippetParams): CodeLine =>
	imageLine(buildEmbedUrl({ username, palette, shape }));

export const buildMarkdownLines = (params: MarkdownSnippetParams): CodeLine[] => [snippetLine(params)];

export const markdownSnippet = (params: MarkdownSnippetParams): string =>
	snippetLine(params)
		.map(([, text]) => text)
		.join("");

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

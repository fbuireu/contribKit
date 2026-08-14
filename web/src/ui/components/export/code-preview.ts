import { DAYS_PER_WEEK, GRID_CELL_COUNT, WEEKS_PER_YEAR } from "@domain/services/dates";
import { SVG_DEFAULT_CELL_GAP, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { buildEmbedUrl } from "@domain/value-objects/embed";
import { PALETTES } from "@domain/value-objects/palette";

type Token = [string, string];
type CodeLine = Token[];

const CELL_STEP = SVG_DEFAULT_CELL_SIZE + SVG_DEFAULT_CELL_GAP;
const VIEWBOX_WIDTH = WEEKS_PER_YEAR * CELL_STEP;
const VIEWBOX_HEIGHT = DAYS_PER_WEEK * CELL_STEP;
const CELL_RADIUS = 2;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const [, low, , high, veryHigh] = PALETTES.github.colors;
const SAMPLE_FILLS = [low, high, veryHigh];
const REMAINING_RECTS = GRID_CELL_COUNT - SAMPLE_FILLS.length;
const IMAGE_ALT = "contributions";

export const userSvgUrl = (username: string): string => buildEmbedUrl({ username });

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

interface RectLineParams {
	column: number;
	fill: string;
}

const rectLine = ({ column, fill }: RectLineParams): CodeLine => [
	["", " "],
	["c-tag", "<rect "],
	...joinWithSpaces([
		attributeTokens({ name: "x", value: column * CELL_STEP }),
		attributeTokens({ name: "y", value: 0 }),
		attributeTokens({ name: "width", value: SVG_DEFAULT_CELL_SIZE }),
		attributeTokens({ name: "height", value: SVG_DEFAULT_CELL_SIZE }),
		attributeTokens({ name: "rx", value: CELL_RADIUS }),
		attributeTokens({ name: "fill", value: fill }),
	]),
	["c-tag", "/>"],
];

export const SVG_LINES: CodeLine[] = [
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
	...SAMPLE_FILLS.map((fill, column) => rectLine({ column, fill })),
	[
		["", " "],
		["c-comment", `<!-- … ${REMAINING_RECTS} more rects … -->`],
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

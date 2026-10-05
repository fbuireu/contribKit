import type { CellShape } from "@domain/value-objects/cell-shape";
import { buildEmbedUrl } from "@domain/value-objects/embed";
import type { Username } from "@domain/value-objects/username";

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

const IMAGE_ALT = "contributions";
const SAMPLE_CELL_COUNT = 3;
const CELL_MARKER = "data-date=";
const ELEMENT_OR_TEXT = /<(?:[^>"]|"[^"]*")*>|[^<]+/g;
const ATTRIBUTE = /([^\s="/<>]+)="([^"]*)"/g;

export interface MarkdownSnippetParams {
	username: Username;
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

const isCell = (element: string): boolean => element.startsWith("<") && element.includes(CELL_MARKER);

const tagTokens = (tag: string): Token[] => {
	const attributes = [...tag.matchAll(ATTRIBUTE)].map(([, name, value]) => attributeTokens({ name, value }));
	if (attributes.length === 0) return [[TokenClass.Tag, tag]];

	return [
		[TokenClass.Tag, `${tag.split(/\s/, 1)[0]} `],
		...joinWithSpaces(attributes),
		[TokenClass.Tag, tag.endsWith("/>") ? "/>" : ">"],
	];
};

const elementLine = (element: string): CodeLine =>
	element.startsWith("<") ? tagTokens(element) : [[TokenClass.Plain, element]];

const elisionLine = (omitted: number): CodeLine => [[TokenClass.Comment, `<!-- … ${omitted} more cells … -->`]];

export const buildSvgLines = (svg: string): CodeLine[] => {
	const elements = svg.match(ELEMENT_OR_TEXT) ?? [];
	const cellsEnd = elements.findLastIndex(isCell) + 1;
	const shownEnd = Math.min(cellsEnd, elements.findIndex(isCell) + SAMPLE_CELL_COUNT);
	const omitted = cellsEnd - shownEnd;

	return [
		...elements.slice(0, shownEnd).map(elementLine),
		...(omitted > 0 ? [elisionLine(omitted)] : []),
		...elements.slice(cellsEnd).map(elementLine),
	];
};

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

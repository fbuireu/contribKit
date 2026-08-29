import { type CellShape, DEFAULT_CELL_SHAPE } from "./cell-shape";
import { DEFAULT_BACKGROUND_COLOR, DEFAULT_PALETTE_KEY } from "./palette";

const EMBED_ORIGIN = "https://contribkit.app";
const EMBED_EXTENSION = ".svg";
const EMBED_SEGMENT = "user";

export const EMBED_ROUTE = /^\/user\/[^/]+\.svg$/;

export const EMBED_BACKGROUND_PATTERN = /^(transparent|#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,30})$/;

export const EmbedParam = {
	Palette: "palette",
	Shape: "shape",
	Background: "background",
} as const;

export interface EmbedQuery {
	readonly palette: string;
	readonly shape: string;
	readonly background: string;
}

export const DEFAULT_EMBED_QUERY: EmbedQuery = {
	palette: DEFAULT_PALETTE_KEY,
	shape: DEFAULT_CELL_SHAPE,
	background: DEFAULT_BACKGROUND_COLOR,
};

export interface BuildEmbedUrlParams {
	readonly username: string;
	readonly palette?: string;
	readonly shape?: CellShape;
	readonly origin?: string;
	readonly keepDefaults?: boolean;
}

const embedPathFor = (username: string): string =>
	`/${EMBED_SEGMENT}/${encodeURIComponent(username)}${EMBED_EXTENSION}`;

type EmbedQueryEntry = readonly [name: string, value: string | undefined, fallback: string];

export const buildEmbedUrl = ({
	username,
	palette,
	shape,
	origin = EMBED_ORIGIN,
	keepDefaults = false,
}: BuildEmbedUrlParams): string => {
	const entries: readonly EmbedQueryEntry[] = [
		[EmbedParam.Palette, palette, DEFAULT_EMBED_QUERY.palette],
		[EmbedParam.Shape, shape, DEFAULT_EMBED_QUERY.shape],
	];
	const query = entries
		.filter((entry): entry is readonly [string, string, string] => {
			const [, value, fallback] = entry;
			return value !== undefined && (keepDefaults || value !== fallback);
		})
		.map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
		.join("&");

	const url = `${origin}${embedPathFor(username)}`;
	return query ? `${url}?${query}` : url;
};

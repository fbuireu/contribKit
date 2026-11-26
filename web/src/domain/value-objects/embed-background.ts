const EMBED_BACKGROUND_PATTERN = /^(transparent|#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,30})$/;

declare const embedBackgroundBrand: unique symbol;

export type EmbedBackground = string & { readonly [embedBackgroundBrand]: true };

export const isEmbedBackground = (value: unknown): value is EmbedBackground =>
	typeof value === "string" && EMBED_BACKGROUND_PATTERN.test(value);

export const embedBackgroundOrThrow = (raw: string): EmbedBackground => {
	if (isEmbedBackground(raw)) return raw;
	throw new Error(`Invalid embed background: "${raw}"`);
};

export const DEFAULT_BACKGROUND_COLOR = embedBackgroundOrThrow("transparent");

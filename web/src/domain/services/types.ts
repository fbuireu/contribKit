import type { ContributionDay } from "../entities/types";
import type { CellShape } from "../value-objects/cell-shape";
import type { EmbedBackground } from "../value-objects/embed-background";
import type { Palette } from "../value-objects/palette";

interface SvgRenderOptions {
	readonly palette: Palette;
	readonly shape: CellShape;
	readonly background: EmbedBackground;
}

interface SvgRendererParams {
	readonly days: readonly ContributionDay[];
	readonly options: SvgRenderOptions;
}

export type SvgRenderer = (params: SvgRendererParams) => string;

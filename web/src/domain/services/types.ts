import type { ContributionDay } from "../entities/types";
import type { CellShape } from "../value-objects/cell-shape";
import type { Palette } from "../value-objects/palette";

export interface SvgRenderOptions {
	readonly palette: Palette;
	readonly shape: CellShape;
	readonly background: string;
	readonly cellSize?: number;
	readonly cellGap?: number;
	readonly showLabels?: boolean;
}

export interface SvgRendererParams {
	readonly days: readonly ContributionDay[];
	readonly options: SvgRenderOptions;
}

export type SvgRenderer = (params: SvgRendererParams) => string;

import type { ContributionCalendar } from "../entities/contribution-calendar";
import type { Palette } from "../value-objects/palette";
import type { ShapeKind } from "../value-objects/shape";

export interface SvgRenderOptions {
	readonly palette: Palette;
	readonly shape: ShapeKind;
	readonly background: string;
	readonly cellSize?: number;
	readonly cellGap?: number;
	readonly showLabels?: boolean;
}

export interface SvgRendererParams {
	readonly calendar: ContributionCalendar;
	readonly options: SvgRenderOptions;
}

export type SvgRenderer = (params: SvgRendererParams) => string;

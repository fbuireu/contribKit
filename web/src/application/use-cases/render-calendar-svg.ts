import type { SvgRenderer, SvgRendererParams } from "@domain/services/types";

export const renderCalendarSvg =
	(renderer: SvgRenderer) =>
	(params: SvgRendererParams): string =>
		renderer(params);

import type { ContributionCalendar } from "@domain/entities/contribution-calendar";
import type { SvgRenderer, SvgRendererParams } from "@domain/services/svg-renderer";

export const renderCalendarSvg =
	(renderer: SvgRenderer) =>
	(params: SvgRendererParams): string =>
		renderer(params);

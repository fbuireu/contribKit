import type { ContributionCalendar } from "../../domain/entities/contribution-calendar";
import type { SvgRenderer, SvgRenderOptions } from "../../domain/services/svg-renderer";

export const renderCalendarSvg =
	(renderer: SvgRenderer) =>
	(calendar: ContributionCalendar, options: SvgRenderOptions): string =>
		renderer(calendar, options);

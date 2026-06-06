import type { ContributionCalendar } from "@domain/entities/types";
import type { SvgRenderer, SvgRendererParams } from "@domain/services/types";
import { DEFAULT_PALETTE_KEY, paletteByKey } from "@domain/value-objects/palette";
import { describe, expect, it, vi } from "vitest";
import { renderCalendarSvg } from "./render-calendar-svg";

const calendar: ContributionCalendar = { username: "torvalds", days: [], total: 0 };
const params: SvgRendererParams = {
	calendar,
	options: { palette: paletteByKey(DEFAULT_PALETTE_KEY), shape: "square", background: "transparent" },
};

describe("renderCalendarSvg", () => {
	it("delegates to the injected renderer and returns its output", () => {
		const renderer: SvgRenderer = vi.fn().mockReturnValue("<svg/>");

		const result = renderCalendarSvg(renderer)(params);

		expect(renderer).toHaveBeenCalledWith(params);
		expect(result).toBe("<svg/>");
	});
});

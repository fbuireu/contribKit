import { buildGridFromApi } from "@domain/services/calendar-grid";
import { DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { PALETTES } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { EXPORT_GRID_GEOMETRY } from "../grid/grid-geometry";
import { renderCalendarString } from "../grid/render-svg";
import { DEFAULT_EXPORT_FORMAT, ExportFormatKey, exportTabDetail, isExportFormatKey } from "./export-formats";

describe("export formats", () => {
	it("exposes the three export formats", () => {
		expect(Object.values(ExportFormatKey)).toEqual(["png", "svg", "md"]);
	});

	it("defaults to png", () => {
		expect(DEFAULT_EXPORT_FORMAT).toBe(ExportFormatKey.Png);
	});
});

describe("isExportFormatKey", () => {
	it("accepts each declared format and nothing else", () => {
		expect(Object.values(ExportFormatKey).every(isExportFormatKey)).toBe(true);
		expect(isExportFormatKey("pdf")).toBe(false);
		expect(isExportFormatKey("")).toBe(false);
		expect(isExportFormatKey(undefined)).toBe(false);
		expect(isExportFormatKey("PNG")).toBe(false);
	});
});

describe("exportTabDetail", () => {
	const FIFTY_THREE_WEEKS = buildGridFromApi({ days: [], year: 2024 });
	const FIFTY_FOUR_WEEKS = buildGridFromApi({ days: [], year: 2028 });

	it("sizes the PNG tab from the calendar it previews, a week at a time", () => {
		expect(exportTabDetail({ key: ExportFormatKey.Png, days: FIFTY_THREE_WEEKS })).toBe("660×108 · transparent");
		expect(exportTabDetail({ key: ExportFormatKey.Png, days: FIFTY_FOUR_WEEKS })).toBe("672×108 · transparent");
	});

	it("counts the weeks the SVG tab draws", () => {
		expect(exportTabDetail({ key: ExportFormatKey.Svg, days: FIFTY_THREE_WEEKS })).toBe("Vector · 53×7 grid");
		expect(exportTabDetail({ key: ExportFormatKey.Svg, days: FIFTY_FOUR_WEEKS })).toBe("Vector · 54×7 grid");
	});

	it("says the size of the viewBox the preview carries, whichever year it draws", () => {
		for (const days of [FIFTY_THREE_WEEKS, FIFTY_FOUR_WEEKS]) {
			const svg = renderCalendarString({
				days,
				palette: PALETTES.github.colors,
				shape: DEFAULT_CELL_SHAPE,
				...EXPORT_GRID_GEOMETRY,
				showLabels: false,
			});
			const [, width, height] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg) ?? [];

			expect(exportTabDetail({ key: ExportFormatKey.Png, days })).toBe(`${width}×${height} · transparent`);
		}
	});

	it("keeps the Markdown tab's line, whatever the days", () => {
		for (const days of [[], FIFTY_THREE_WEEKS, FIFTY_FOUR_WEEKS]) {
			expect(exportTabDetail({ key: ExportFormatKey.Md, days })).toBe("Live embed, re-renders on view");
		}
	});

	it("says something for every Export Format", () => {
		for (const key of Object.values(ExportFormatKey)) {
			expect(exportTabDetail({ key, days: FIFTY_THREE_WEEKS }), key).not.toBe("");
		}
	});
});

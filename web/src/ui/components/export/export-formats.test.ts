import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_FORMAT, ExportFormatKey } from "./export-formats";

describe("export formats", () => {
	it("exposes the three export formats", () => {
		expect(Object.values(ExportFormatKey)).toEqual(["png", "svg", "md"]);
	});

	it("defaults to png", () => {
		expect(DEFAULT_EXPORT_FORMAT).toBe(ExportFormatKey.Png);
	});
});

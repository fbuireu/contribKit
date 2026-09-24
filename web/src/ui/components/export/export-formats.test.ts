import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_FORMAT, ExportFormatKey, isExportFormatKey } from "./export-formats";

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
	});
});

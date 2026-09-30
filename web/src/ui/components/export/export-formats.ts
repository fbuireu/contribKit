import { z } from "zod/mini";

export const ExportFormatKey = {
	Png: "png",
	Svg: "svg",
	Md: "md",
} as const;

export type ExportFormatKey = (typeof ExportFormatKey)[keyof typeof ExportFormatKey];

export const DEFAULT_EXPORT_FORMAT: ExportFormatKey = ExportFormatKey.Png;

const exportFormatKey = z.enum(ExportFormatKey);

export const isExportFormatKey = (value: unknown): value is ExportFormatKey => z.validate(exportFormatKey, value);

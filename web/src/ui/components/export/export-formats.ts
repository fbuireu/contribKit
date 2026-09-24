export const ExportFormatKey = {
	Png: "png",
	Svg: "svg",
	Md: "md",
} as const;

export type ExportFormatKey = (typeof ExportFormatKey)[keyof typeof ExportFormatKey];

export const DEFAULT_EXPORT_FORMAT: ExportFormatKey = ExportFormatKey.Png;

export const isExportFormatKey = (value: string): value is ExportFormatKey =>
	(Object.values(ExportFormatKey) as string[]).includes(value);

import type { ContributionDay } from "@domain/entities/types";
import { DAYS_PER_WEEK, weeksOf } from "@domain/services/dates";
import { calendarLayout } from "@domain/services/svg-geometry";
import { DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { z } from "astro/zod";
import { EXPORT_GRID_GEOMETRY } from "../grid/grid-geometry";

export const ExportFormatKey = {
	Png: "png",
	Svg: "svg",
	Md: "md",
} as const;

export type ExportFormatKey = (typeof ExportFormatKey)[keyof typeof ExportFormatKey];

export const DEFAULT_EXPORT_FORMAT: ExportFormatKey = ExportFormatKey.Png;

const exportFormatKeySchema = z.enum(ExportFormatKey);

export const isExportFormatKey = (value: unknown): value is ExportFormatKey => exportFormatKeySchema.validate(value);

export interface ExportTabDetailParams {
	key: ExportFormatKey;
	days: readonly ContributionDay[];
}

export const exportTabDetail = ({ key, days }: ExportTabDetailParams): string => {
	switch (key) {
		case ExportFormatKey.Png: {
			const { width, height } = calendarLayout({
				days,
				shape: DEFAULT_CELL_SHAPE,
				...EXPORT_GRID_GEOMETRY,
				showLabels: false,
			});
			return `${width}×${height} · transparent`;
		}
		case ExportFormatKey.Svg:
			return `Vector · ${weeksOf(days).length}×${DAYS_PER_WEEK} grid`;
		case ExportFormatKey.Md:
			return "Live embed, re-renders on view";
	}
};

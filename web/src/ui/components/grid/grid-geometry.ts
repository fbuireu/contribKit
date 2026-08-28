import { SVG_DEFAULT_CELL_GAP, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";

export interface GridGeometry {
	readonly size: number;
	readonly gap: number;
}

export const HERO_GRID_GEOMETRY: GridGeometry = { size: 13, gap: 3 };
export const CUSTOMIZE_GRID_GEOMETRY: GridGeometry = { size: 12, gap: 3 };
export const EXPORT_GRID_GEOMETRY: GridGeometry = { size: SVG_DEFAULT_CELL_SIZE, gap: SVG_DEFAULT_CELL_GAP };

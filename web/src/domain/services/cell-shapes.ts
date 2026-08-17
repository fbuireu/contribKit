import { CellShape } from "../value-objects/cell-shape";
import { dotRadius, hexPoints } from "./svg-geometry";

export interface CellShapeParams {
	shape: CellShape;
	x: number;
	y: number;
	size: number;
	radius: number;
	fill: string;
	level: number;
	attributes?: string;
}

type ShapeMarkupRenderer = (params: CellShapeParams) => string;

const renderRectCell: ShapeMarkupRenderer = ({ x, y, size, radius, fill, attributes = "" }) =>
	`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"${attributes}/>`;

const SHAPE_MARKUP_RENDERERS: Record<CellShape, ShapeMarkupRenderer> = {
	[CellShape.Rounded]: renderRectCell,
	[CellShape.Square]: renderRectCell,
	[CellShape.Circle]: ({ x, y, size, fill, attributes = "" }) =>
		`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"${attributes}/>`,
	[CellShape.Dot]: ({ x, y, size, fill, level, attributes = "" }) =>
		`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${dotRadius({ level, size })}" fill="${fill}"${attributes}/>`,
	[CellShape.Hex]: ({ x, y, size, fill, attributes = "" }) =>
		`<polygon points="${hexPoints({ cx: x + size / 2, cy: y + size / 2, radius: size / 2 })}" fill="${fill}"${attributes}/>`,
};

export const renderCellShape = (params: CellShapeParams): string => SHAPE_MARKUP_RENDERERS[params.shape](params);

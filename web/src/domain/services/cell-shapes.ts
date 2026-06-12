import { ShapeKind } from "../value-objects/shape";
import { dotRadius, hexPoints } from "./svg-geometry";

export interface CellShapeParams {
	shape: ShapeKind;
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

const SHAPE_MARKUP_RENDERERS: Record<ShapeKind, ShapeMarkupRenderer> = {
	[ShapeKind.Rounded]: renderRectCell,
	[ShapeKind.Square]: renderRectCell,
	[ShapeKind.Circle]: ({ x, y, size, fill, attributes = "" }) =>
		`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"${attributes}/>`,
	[ShapeKind.Dot]: ({ x, y, size, fill, level, attributes = "" }) =>
		`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${dotRadius(level)}" fill="${fill}"${attributes}/>`,
	[ShapeKind.Hex]: ({ x, y, size, fill, attributes = "" }) =>
		`<polygon points="${hexPoints({ cx: x + size / 2, cy: y + size / 2, radius: size / 2 })}" fill="${fill}"${attributes}/>`,
};

export const renderCellShape = (params: CellShapeParams): string => SHAPE_MARKUP_RENDERERS[params.shape](params);

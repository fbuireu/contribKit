import shapes from "@shared/shapes.json" with { type: "json" };

export const CellShape = {
	Rounded: "rounded",
	Square: "square",
	Circle: "circle",
	Dot: "dot",
	Hex: "hex",
} as const;

export type CellShape = (typeof CellShape)[keyof typeof CellShape];

const RENDERABLE_CELL_SHAPES: ReadonlySet<string> = new Set(Object.values(CellShape));

export const CELL_SHAPES: readonly CellShape[] = shapes
	.map((shape) => shape.key)
	.filter((key): key is CellShape => RENDERABLE_CELL_SHAPES.has(key));

export const DEFAULT_CELL_SHAPE: CellShape = CELL_SHAPES[0];

export const isCellShape = (value: string): value is CellShape => (CELL_SHAPES as readonly string[]).includes(value);

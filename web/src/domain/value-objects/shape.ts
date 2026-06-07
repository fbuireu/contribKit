import shapes from "@shared/shapes.json" with { type: "json" };

export const ShapeKind = {
	Rounded: "rounded",
	Square: "square",
	Circle: "circle",
	Dot: "dot",
	Hex: "hex",
} as const;

export type ShapeKind = (typeof ShapeKind)[keyof typeof ShapeKind];

export const SHAPE_KINDS: readonly ShapeKind[] = shapes.map((shape) => shape.key) as ShapeKind[];

export const DEFAULT_SHAPE_KIND: ShapeKind = SHAPE_KINDS[0];

export const isShapeKind = (value: string): value is ShapeKind => (SHAPE_KINDS as readonly string[]).includes(value);

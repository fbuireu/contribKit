import rawShapes from '@shared/shapes.json' with { type: 'json' };

export type ShapeKind = 'rounded' | 'square' | 'circle' | 'dot' | 'hex';

export const SHAPE_KINDS: readonly ShapeKind[] = rawShapes.map((s) => s.key) as ShapeKind[];

export const isShapeKind = (value: string): value is ShapeKind =>
  (SHAPE_KINDS as readonly string[]).includes(value);

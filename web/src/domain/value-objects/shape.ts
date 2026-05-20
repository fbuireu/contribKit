export type ShapeKind = 'rounded' | 'square' | 'circle' | 'dot' | 'hex';

export const SHAPE_KINDS: readonly ShapeKind[] = ['rounded', 'square', 'circle', 'dot', 'hex'] as const;

export const isShapeKind = (value: string): value is ShapeKind =>
  (SHAPE_KINDS as readonly string[]).includes(value);

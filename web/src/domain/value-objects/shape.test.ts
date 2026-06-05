import { describe, expect, it } from "vitest";
import { DEFAULT_SHAPE_KIND, isShapeKind, SHAPE_KINDS } from "./shape";

describe("shape", () => {
	it("exposes at least one shape kind", () => {
		expect(SHAPE_KINDS.length).toBeGreaterThan(0);
	});

	it("DEFAULT_SHAPE_KIND is a valid shape", () => {
		expect(isShapeKind(DEFAULT_SHAPE_KIND)).toBe(true);
	});

	it("isShapeKind accepts every known shape", () => {
		for (const kind of SHAPE_KINDS) expect(isShapeKind(kind)).toBe(true);
	});

	it("isShapeKind rejects unknown values", () => {
		expect(isShapeKind("triangle")).toBe(false);
		expect(isShapeKind("")).toBe(false);
	});
});

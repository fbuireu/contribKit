// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { ClassName, ElementId, Selector } from "./dom-contract";

describe("ElementId", () => {
	it("declares every id unique, so two components cannot claim the same node", () => {
		const ids = Object.values(ElementId);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it("uses kebab-case throughout, which is what the CSS and the markup expect", () => {
		for (const id of Object.values(ElementId)) {
			expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
		}
	});
});

describe("Selector", () => {
	it("builds every compound selector from the declared id and class names", () => {
		expect(Selector.ActivePaletteRow).toBe(`#${ElementId.PaletteList} .${ClassName.PaletteRow}.${ClassName.Active}`);
		expect(Selector.ActiveShapeButton).toBe(`#${ElementId.ShapeList} .${ClassName.ShapeButton}.${ClassName.Active}`);
		expect(Selector.ExportCopyButton).toBe(`#${ElementId.ExportPreview} .${ClassName.CopyButton}`);
	});

	it("is parseable by the DOM, so a typo cannot slip through as a silent no-match", () => {
		const scope = document.createDocumentFragment();

		for (const selector of Object.values(Selector)) {
			expect(() => scope.querySelector(selector)).not.toThrow();
		}
	});
});

// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { initPage } from "./page-init";

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe("initPage", () => {
	it("wires the page without throwing on a minimal DOM", () => {
		document.body.innerHTML = "";
		expect(() => initPage()).not.toThrow();
	});

	it("renders the calendar svg into the hero grid container", () => {
		document.body.innerHTML = `<div id="hero-grid-container"></div>`;
		initPage();
		expect(byId("hero-grid-container").innerHTML).toContain("<svg");
	});
});

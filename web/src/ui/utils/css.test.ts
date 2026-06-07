import { describe, expect, it } from "vitest";
import { cssVar } from "./css";

describe("cssVar", () => {
	it("wraps a token in a CSS var() reference", () => {
		expect(cssVar("--contrib-peak")).toBe("var(--contrib-peak)");
	});
});

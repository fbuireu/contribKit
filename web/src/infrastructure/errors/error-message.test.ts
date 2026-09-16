import { describe, expect, it } from "vitest";
import { errorMessageOf } from "./error-message";

describe("errorMessageOf", () => {
	it("takes the message off an Error and nothing else from it", () => {
		expect(errorMessageOf(new TypeError("fetch failed"))).toBe("fetch failed");
	});

	it("describes anything that is not an Error rather than dropping it", () => {
		expect(errorMessageOf("refused")).toBe("refused");
		expect(errorMessageOf(42)).toBe("42");
		expect(errorMessageOf(null)).toBe("null");
		expect(errorMessageOf(undefined)).toBe("undefined");
	});
});

import { describe, expect, it } from "vitest";
import { LOG_LEVEL, LOG_SERVICE } from "./contract";

describe("the log contract", () => {
	it("names one service, so the logs and the spans answer the same query", () => {
		expect(LOG_SERVICE).toBe("contribkit-web");
	});

	it("carries a level for every console method the logger writes through", () => {
		expect(Object.values(LOG_LEVEL)).toEqual(["info", "warn", "error"]);
	});
});

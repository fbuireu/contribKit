import { describe, expect, it } from "vitest";
import { LOG_LEVEL, LOG_SERVICE, stripQuery } from "./contract";

describe("the log contract", () => {
	it("names one service, so the logs and the spans answer the same query", () => {
		expect(LOG_SERVICE).toBe("contribkit-web");
	});

	it("carries a level for every console method the logger writes through", () => {
		expect(Object.values(LOG_LEVEL)).toEqual(["info", "warn", "error"]);
	});
});

describe("stripQuery", () => {
	it("keeps the origin and the path and drops everything after the ?", () => {
		expect(stripQuery("https://contribkit.app/user/octocat.svg?theme=dark&token=x")).toBe(
			"https://contribkit.app/user/octocat.svg",
		);
	});

	it("answers undefined for an empty or unparseable value rather than echoing it", () => {
		expect(stripQuery(undefined)).toBeUndefined();
		expect(stripQuery("")).toBeUndefined();
		expect(stripQuery("not a url")).toBeUndefined();
	});
});

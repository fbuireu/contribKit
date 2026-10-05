import { describe, expect, it } from "vitest";
import { REQUEST_TIMEOUT_MS } from "./request-timeout";

describe("REQUEST_TIMEOUT_MS", () => {
	it("is twenty seconds, the limit every outbound request of the Worker, the browser and the app gets", () => {
		expect(REQUEST_TIMEOUT_MS).toBe(20_000);
	});
});

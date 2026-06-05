import { describe, expect, it, vi } from "vitest";

vi.mock("@logtail/edge", () => ({
	Logtail: vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		withExecutionContext() {
			return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
		},
	})),
}));

import { getLogger } from "./better-stack-logger";

describe("getLogger", () => {
	it("returns a logger exposing info, warn and error", () => {
		const logger = getLogger();
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.error).toBe("function");
	});

	it("never throws when logging, with or without a context", () => {
		const logger = getLogger();
		expect(() => logger.info({ message: "hello", context: { a: 1 } })).not.toThrow();
		expect(() => logger.warn({ message: "careful" })).not.toThrow();
		expect(() => logger.error({ message: "boom", context: { code: 500 } })).not.toThrow();
	});
});

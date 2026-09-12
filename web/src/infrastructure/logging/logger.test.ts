import { afterEach, describe, expect, it, vi } from "vitest";
import { LOG_LEVEL, type LogLevel } from "./contract";
import { logger } from "./logger";

const spies = () => ({
	info: vi.spyOn(console, "info").mockImplementation(() => {}),
	warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
	error: vi.spyOn(console, "error").mockImplementation(() => {}),
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("the Worker logger", () => {
	it.each(Object.values(LOG_LEVEL))(
		"emits %s through the console method of its own name and no other, which is what Cloudflare exports",
		(level) => {
			const console = spies();

			logger[level as LogLevel]({ message: "hello" });

			expect(console[level as LogLevel]).toHaveBeenCalledOnce();
			for (const other of Object.values(LOG_LEVEL)) {
				if (other !== level) expect(console[other as LogLevel]).not.toHaveBeenCalled();
			}
		},
	);

	it("writes one JSON line per call, tagged with the service and the level", () => {
		const console = spies();

		logger.error({ message: "boom", context: { status: 500, username: "octocat" } });

		expect(JSON.parse(console.error.mock.calls[0][0])).toEqual({
			service: "contribkit-web",
			level: "error",
			message: "boom",
			status: 500,
			username: "octocat",
		});
	});

	it("writes a line with no context at all rather than an empty object", () => {
		const console = spies();

		logger.info({ message: "bare" });

		expect(JSON.parse(console.info.mock.calls[0][0])).toEqual({
			service: "contribkit-web",
			level: "info",
			message: "bare",
		});
	});

	it("does not let a context key overwrite the fields the sink queries on", () => {
		const console = spies();

		logger.warn({ message: "careful", context: { service: "impostor", level: "info", message: "impostor" } });

		expect(JSON.parse(console.warn.mock.calls[0][0])).toEqual({
			service: "contribkit-web",
			level: "warn",
			message: "careful",
		});
	});
});

describe("a log never fails its caller", () => {
	it("drops a context that cannot be serialised rather than throwing from the route that logged it", () => {
		const console = spies();
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(() => logger.info({ message: "round trip", context: circular })).not.toThrow();
		expect(console.info).not.toHaveBeenCalled();
	});

	it("swallows a console that throws synchronously", () => {
		const console = spies();
		console.error.mockImplementationOnce(() => {
			throw new Error("sink down");
		});

		expect(() => logger.error({ message: "still fine" })).not.toThrow();
	});
});

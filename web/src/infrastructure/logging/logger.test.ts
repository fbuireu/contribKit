import { afterEach, describe, expect, it, vi } from "vitest";
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
	it("sends each level to the matching console method, which is what Cloudflare exports", () => {
		const console = spies();

		logger.info({ message: "hello" });
		logger.warn({ message: "careful" });
		logger.error({ message: "boom" });

		expect(console.info).toHaveBeenCalledOnce();
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.error).toHaveBeenCalledOnce();
	});

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

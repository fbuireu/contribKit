import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: { level: string; message: string; payload: Record<string, unknown> }[] = [];
const contexts: unknown[] = [];

const record =
	(level: string) =>
	(message: string, payload: Record<string, unknown>): void => {
		calls.push({ level, message, payload });
	};

const client = {
	info: record("info"),
	warn: record("warn"),
	error: record("error"),
	withExecutionContext(executionContext: unknown) {
		contexts.push(executionContext);
		return { info: record("scoped-info"), warn: record("scoped-warn"), error: record("scoped-error") };
	},
};

const Logtail = vi.fn(function LogtailStub() {
	return client;
});

vi.mock("@logtail/edge", () => ({ Logtail }));

const CONFIGURED = {
	PUBLIC_BETTER_STACK_SOURCE_TOKEN: "token",
	PUBLIC_BETTER_STACK_INGESTING_URL: "https://in.example.com",
};

const load = async (env: Record<string, string>) => {
	vi.resetModules();
	for (const key of Object.keys(CONFIGURED)) vi.stubEnv(key, env[key] ?? "");
	return import("./better-stack-logger");
};

beforeEach(() => {
	calls.length = 0;
	contexts.length = 0;
	Logtail.mockClear();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("getLogger, configured", () => {
	it("writes each level through to the client, tagged with the service", async () => {
		const { getLogger } = await load(CONFIGURED);

		const logger = getLogger();
		logger.info({ message: "hello", context: { a: 1 } });
		logger.warn({ message: "careful" });
		logger.error({ message: "boom", context: { status: 500 } });

		expect(calls).toEqual([
			{ level: "info", message: "hello", payload: { service: "contribkit-web", a: 1 } },
			{ level: "warn", message: "careful", payload: { service: "contribkit-web" } },
			{ level: "error", message: "boom", payload: { service: "contribkit-web", status: 500 } },
		]);
	});

	it("constructs the client once, however many loggers are asked for", async () => {
		const { getLogger } = await load(CONFIGURED);

		getLogger();
		getLogger();

		expect(Logtail).toHaveBeenCalledTimes(1);
		expect(Logtail).toHaveBeenCalledWith("token", expect.objectContaining({ endpoint: "https://in.example.com" }));
	});

	it("scopes the writer to an execution context when one is given, and not when it is not", async () => {
		const { getLogger } = await load(CONFIGURED);
		const executionContext = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

		getLogger(executionContext).info({ message: "scoped" });
		getLogger().info({ message: "bare" });

		expect(contexts).toEqual([executionContext]);
		expect(calls.map((call) => call.level)).toEqual(["scoped-info", "info"]);
	});

	it("loggerFor digs the execution context out of Astro locals", async () => {
		const { loggerFor } = await load(CONFIGURED);
		const cfContext = { waitUntil: () => {} } as unknown as ExecutionContext;

		loggerFor({ cfContext }).info({ message: "from a route" });
		loggerFor(undefined).info({ message: "from nowhere" });

		expect(contexts).toEqual([cfContext]);
	});
});

describe("getLogger, unconfigured", () => {
	it("never constructs a client, and swallows every write", async () => {
		const { getLogger } = await load({});

		const logger = getLogger();
		expect(() => logger.info({ message: "hello", context: { a: 1 } })).not.toThrow();
		expect(() => logger.warn({ message: "careful" })).not.toThrow();
		expect(() => logger.error({ message: "boom" })).not.toThrow();

		expect(Logtail).not.toHaveBeenCalled();
		expect(calls).toEqual([]);
	});

	it("stays silent when only one half of the configuration is present", async () => {
		const { getLogger } = await load({ PUBLIC_BETTER_STACK_SOURCE_TOKEN: "token" });

		getLogger().error({ message: "boom" });

		expect(Logtail).not.toHaveBeenCalled();
		expect(calls).toEqual([]);
	});
});

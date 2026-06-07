import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = {
	BETTER_STACK_SOURCE_TOKEN: "tok_123",
	BETTER_STACK_INGESTING_URL: "https://logs.betterstack.test",
};

type Log = { message: unknown[]; level: string; timestamp: number };
type Exception = { name: string; message: string; timestamp: number };

const makeEvent = (over: { logs?: Log[]; exceptions?: Exception[] } = {}) => ({
	event: { request: { url: "https://x/api", method: "GET", headers: {} }, response: { status: 200 } },
	eventTimestamp: 0,
	logs: over.logs ?? [],
	exceptions: over.exceptions ?? [],
	outcome: "ok",
	scriptName: "contribkit",
});

const stubFetch = () => {
	const fetchMock = vi.fn((_url: string, _init: { headers: Record<string, string>; body: string }) =>
		Promise.resolve(new Response()),
	);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

const bodyOf = (fetchMock: ReturnType<typeof stubFetch>) => JSON.parse(fetchMock.mock.calls[0][1].body);

describe("tail worker", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("does not POST when there are no logs or exceptions", async () => {
		const fetchMock = stubFetch();
		await worker.tail([makeEvent()], env);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("forwards logs to Better Stack with the bearer token", async () => {
		const fetchMock = stubFetch();
		await worker.tail([makeEvent({ logs: [{ message: ["hello", 42], level: "info", timestamp: 0 }] })], env);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(env.BETTER_STACK_INGESTING_URL);
		expect(init.headers.Authorization).toBe("Bearer tok_123");
		expect(bodyOf(fetchMock)[0]).toMatchObject({ level: "info", message: "hello 42", script: "contribkit" });
	});

	it("flattens exceptions into error-level entries", async () => {
		const fetchMock = stubFetch();
		await worker.tail([makeEvent({ exceptions: [{ name: "TypeError", message: "boom", timestamp: 0 }] })], env);
		expect(bodyOf(fetchMock)[0]).toMatchObject({ level: "error", message: "TypeError: boom" });
	});

	it("attaches request metadata to each entry", async () => {
		const fetchMock = stubFetch();
		await worker.tail([makeEvent({ logs: [{ message: ["x"], level: "info", timestamp: 0 }] })], env);
		expect(bodyOf(fetchMock)[0]).toMatchObject({ url: "https://x/api", method: "GET", status: 200, outcome: "ok" });
	});
});

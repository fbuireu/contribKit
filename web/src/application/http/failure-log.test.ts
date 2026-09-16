import { FailureKind } from "@domain/failures/failure";
import { describe, expect, it, vi } from "vitest";
import {
	ContributionsEndpoint,
	logContactFailure,
	logContributionsFailure,
	logServerError,
	SERVER_ERROR_STATUS,
} from "./failure-log";

const loggerSpy = () => ({ error: vi.fn(), logError: vi.fn() });

const params = {
	username: "torvalds",
	kind: FailureKind.Network,
	status: 502,
	reason: "GitHub returned 503",
	endpoint: ContributionsEndpoint.Api,
};

describe("logContributionsFailure", () => {
	it("logs a server error with the endpoint that saw it", () => {
		const logger = loggerSpy();

		logContributionsFailure({ logger, ...params });

		expect(logger.error).toHaveBeenCalledWith({
			message: "GitHub contributions fetch failed",
			context: {
				username: "torvalds",
				kind: FailureKind.Network,
				reason: "GitHub returned 503",
				status: 502,
				endpoint: "api",
			},
		});
	});

	it("stays silent below the server-error threshold, so callers need no condition", () => {
		const logger = loggerSpy();

		logContributionsFailure({ logger, ...params, kind: FailureKind.NotFound, status: 404 });

		expect(logger.error).not.toHaveBeenCalled();
	});

	it("logs exactly at the threshold", () => {
		const logger = loggerSpy();

		logContributionsFailure({ logger, ...params, status: SERVER_ERROR_STATUS });

		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it("does not log a 400", () => {
		const logger = loggerSpy();

		logContributionsFailure({ logger, ...params, kind: FailureKind.InvalidInput, status: 400 });

		expect(logger.error).not.toHaveBeenCalled();
	});

	it("distinguishes the three surfaces, which is all Better Stack has to tell them apart", () => {
		const logger = loggerSpy();

		for (const endpoint of [ContributionsEndpoint.Api, ContributionsEndpoint.Svg, ContributionsEndpoint.Page]) {
			logContributionsFailure({ logger, ...params, endpoint });
		}

		const tags = logger.error.mock.calls.map(([call]) => call.context.endpoint);
		expect(tags).toEqual(["api", "svg", "page"]);
	});
});

describe("logContactFailure", () => {
	it("logs a failed delivery with the platform's own reason, which never reaches the visitor", () => {
		const logger = loggerSpy();

		logContactFailure({
			logger,
			kind: FailureKind.Delivery,
			status: 502,
			reason: "destination address not verified",
		});

		expect(logger.error).toHaveBeenCalledWith({
			message: "Contact message delivery failed",
			context: { kind: FailureKind.Delivery, reason: "destination address not verified", status: 502 },
		});
	});

	it("stays silent below the server-error threshold, so a rejected address is not an incident", () => {
		const logger = loggerSpy();

		logContactFailure({ logger, kind: FailureKind.InvalidInput, status: 400, reason: "bad address" });

		expect(logger.error).not.toHaveBeenCalled();
	});

	it("logs exactly at the threshold", () => {
		const logger = loggerSpy();

		logContactFailure({ logger, kind: FailureKind.Delivery, status: SERVER_ERROR_STATUS, reason: "boom" });

		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it("carries no name, address or message, which is the whole reason it takes four fields", () => {
		const logger = loggerSpy();

		logContactFailure({ logger, kind: FailureKind.Delivery, status: 502, reason: "upstream refused" });

		const [call] = logger.error.mock.calls[0];
		expect(Object.keys(call.context)).toEqual(["kind", "reason", "status"]);
	});
});

describe("logServerError", () => {
	it("hands the throwable to logError with the path, so the writer serialises it the same way everywhere", () => {
		const logger = loggerSpy();
		const error = new Error("kaboom");

		logServerError({ logger, error, path: "/oops" });

		expect(logger.logError).toHaveBeenCalledWith({
			message: "Unhandled server error (500)",
			error,
			context: { path: "/oops" },
		});
	});

	it("passes a non-Error value through untouched, since describing it is the writer's job", () => {
		const logger = loggerSpy();

		logServerError({ logger, error: "boom string", path: "/x" });

		expect(logger.logError).toHaveBeenCalledWith(expect.objectContaining({ error: "boom string" }));
	});

	it("says nothing when Astro handed it no throwable, so visiting /500 by hand reports no incident", () => {
		const logger = loggerSpy();

		logServerError({ logger, error: undefined, path: "/500" });

		expect(logger.logError).not.toHaveBeenCalled();
	});

	it("still reports a thrown null, which is a real render failure", () => {
		const logger = loggerSpy();

		logServerError({ logger, error: null, path: "/y" });

		expect(logger.logError).toHaveBeenCalledWith(expect.objectContaining({ error: null, context: { path: "/y" } }));
	});
});

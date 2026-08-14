import { FailureKind } from "@domain/failures/failure";
import { describe, expect, it, vi } from "vitest";
import { SERVER_ERROR_STATUS } from "./failure-http";
import { ContributionsEndpoint, logContributionsFailure } from "./log-contributions-failure";

const loggerSpy = () => ({ error: vi.fn() });

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

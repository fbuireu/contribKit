import type { Failure } from "@domain/failures/failure";
import { SERVER_ERROR_STATUS } from "./failure-http";

export interface FailureLogger {
	error(params: { message: string; context?: Record<string, unknown> }): void;
}

export const ContributionsEndpoint = {
	Api: "api",
	Svg: "svg",
	Page: "page",
} as const;

export type ContributionsEndpoint = (typeof ContributionsEndpoint)[keyof typeof ContributionsEndpoint];

export interface LogContributionsFailureParams {
	logger: FailureLogger;
	username: string;
	kind: Failure["kind"];
	status: number;
	reason: string;
	endpoint: ContributionsEndpoint;
}

export const logContributionsFailure = ({
	logger,
	username,
	kind,
	status,
	reason,
	endpoint,
}: LogContributionsFailureParams): void => {
	if (status < SERVER_ERROR_STATUS) return;

	logger.error({
		message: "GitHub contributions fetch failed",
		context: { username, kind, reason, status, endpoint },
	});
};

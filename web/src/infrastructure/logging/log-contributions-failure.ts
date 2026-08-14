import { SERVER_ERROR_STATUS } from "@application/http/failure-http";
import type { Failure } from "@domain/failures/failure";
import type { ServerErrorLogger } from "./log-server-error";

export const ContributionsEndpoint = {
	Api: "api",
	Svg: "svg",
	Page: "page",
} as const;

export type ContributionsEndpoint = (typeof ContributionsEndpoint)[keyof typeof ContributionsEndpoint];

export interface LogContributionsFailureParams {
	logger: ServerErrorLogger;
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

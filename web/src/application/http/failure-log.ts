import type { Failure } from "@domain/failures/failure";

export const SERVER_ERROR_STATUS = 500;

export const SERVER_ERROR_MESSAGE = "Something went wrong. Please try again.";

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

export interface LogServerErrorParams {
	logger: FailureLogger;
	error: unknown;
	path: string;
}

const describeError = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (!error) return "unknown";
	if (typeof error === "object") {
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	}
	return String(error);
};

export const logServerError = ({ logger, error, path }: LogServerErrorParams): void => {
	if (error === undefined) return;

	logger.error({
		message: "Unhandled server error (500)",
		context: { path, reason: describeError(error) },
	});
};

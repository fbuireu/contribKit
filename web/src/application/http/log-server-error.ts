import type { FailureLogger } from "./failure-logger";

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
			return JSON.stringify(error) ?? String(error);
		} catch {
			return String(error);
		}
	}
	return String(error);
};

export const logServerError = ({ logger, error, path }: LogServerErrorParams): void => {
	logger.error({
		message: "Unhandled server error (500)",
		context: { path, reason: describeError(error) },
	});
};

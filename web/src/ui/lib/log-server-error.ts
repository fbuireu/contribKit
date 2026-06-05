export interface ServerErrorLogger {
	error(params: { message: string; context?: Record<string, unknown> }): void;
}

export interface LogServerErrorParams {
	logger: ServerErrorLogger;
	error: unknown;
	path: string;
}

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : error ? String(error) : "unknown";

export const logServerError = ({ logger, error, path }: LogServerErrorParams): void => {
	logger.error({
		message: "Unhandled server error (500)",
		context: { path, reason: describeError(error) },
	});
};

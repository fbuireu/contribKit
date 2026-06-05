import { Logtail } from "@logtail/edge";

type LogContext = Record<string, unknown>;

export interface Logger {
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, context?: LogContext): void;
}

const SERVICE = "contribkit-web";

let logtail: Logtail | null | undefined;

function resolveLogtail(): Logtail | null {
	if (logtail !== undefined) return logtail;
	const sourceToken = import.meta.env.PUBLIC_BETTER_STACK_SOURCE_TOKEN;
	const endpoint = import.meta.env.PUBLIC_BETTER_STACK_INGESTING_URL;
	logtail =
		sourceToken && endpoint ? new Logtail(sourceToken, { endpoint, warnAboutMissingExecutionContext: false }) : null;
	return logtail;
}

export function getLogger(executionContext?: ExecutionContext): Logger {
	const client = resolveLogtail();
	const writer = client && executionContext ? client.withExecutionContext(executionContext) : client;

	const write = (level: "info" | "warn" | "error", message: string, context?: LogContext): void => {
		if (!writer) return;
		const payload = { service: SERVICE, ...context };
		if (level === "info") void writer.info(message, payload);
		else if (level === "warn") void writer.warn(message, payload);
		else void writer.error(message, payload);
	};

	return {
		info: (message, context) => write("info", message, context),
		warn: (message, context) => write("warn", message, context),
		error: (message, context) => write("error", message, context),
	};
}

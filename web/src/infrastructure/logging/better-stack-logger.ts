import { Logtail } from "@logtail/edge";

type LogContext = Record<string, unknown>;

export interface LogParams {
	message: string;
	context?: LogContext;
}

interface WriteParams extends LogParams {
	level: "info" | "warn" | "error";
}

export interface Logger {
	info(params: LogParams): void;
	warn(params: LogParams): void;
	error(params: LogParams): void;
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

	const write = ({ level, message, context }: WriteParams): void => {
		if (!writer) return;
		const payload = { service: SERVICE, ...context };
		if (level === "info") void writer.info(message, payload);
		else if (level === "warn") void writer.warn(message, payload);
		else void writer.error(message, payload);
	};

	return {
		info: (params) => write({ level: "info", ...params }),
		warn: (params) => write({ level: "warn", ...params }),
		error: (params) => write({ level: "error", ...params }),
	};
}

export const loggerFor = (locals: unknown): Logger =>
	getLogger((locals as { cfContext?: ExecutionContext } | undefined)?.cfContext);

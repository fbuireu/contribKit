import { LOG_LEVEL, LOG_SERVICE, type LogLevel } from "./contract";

type LogContext = Record<string, unknown>;

export interface LogParams {
	message: string;
	context?: LogContext;
}

interface WriteParams extends LogParams {
	level: LogLevel;
}

export interface Logger {
	info(params: LogParams): void;
	warn(params: LogParams): void;
	error(params: LogParams): void;
}

const write = ({ level, message, context }: WriteParams): void => {
	const line = JSON.stringify({ ...context, service: LOG_SERVICE, level, message });

	if (level === LOG_LEVEL.INFO) console.info(line);
	else if (level === LOG_LEVEL.WARN) console.warn(line);
	else console.error(line);
};

export const logger: Logger = {
	info: (params) => write({ level: LOG_LEVEL.INFO, ...params }),
	warn: (params) => write({ level: LOG_LEVEL.WARN, ...params }),
	error: (params) => write({ level: LOG_LEVEL.ERROR, ...params }),
};

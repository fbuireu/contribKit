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
	try {
		console[level](JSON.stringify({ ...context, service: LOG_SERVICE, level, message }));
	} catch {
		return;
	}
};

export const logger: Logger = {
	info: (params) => write({ level: LOG_LEVEL.INFO, ...params }),
	warn: (params) => write({ level: LOG_LEVEL.WARN, ...params }),
	error: (params) => write({ level: LOG_LEVEL.ERROR, ...params }),
};

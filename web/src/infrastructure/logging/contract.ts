export const LOG_SERVICE = "contribkit-web";

export const LOG_LEVEL = {
	INFO: "info",
	WARN: "warn",
	ERROR: "error",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

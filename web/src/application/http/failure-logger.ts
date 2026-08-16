export interface FailureLogger {
	error(params: { message: string; context?: Record<string, unknown> }): void;
}

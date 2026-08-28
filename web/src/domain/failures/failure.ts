import type { Username } from "../value-objects/username";
export const FailureKind = {
	NotFound: "NotFound",
	InvalidInput: "InvalidInput",
	Network: "Network",
	Parse: "Parse",
	RateLimited: "RateLimited",
} as const;

export type FailureKind = (typeof FailureKind)[keyof typeof FailureKind];

export const FailureField = {
	Username: "username",
	Year: "year",
} as const;

export type FailureField = (typeof FailureField)[keyof typeof FailureField];

export type Failure =
	| { readonly kind: typeof FailureKind.NotFound; readonly username: Username }
	| { readonly kind: typeof FailureKind.InvalidInput; readonly field: FailureField; readonly message: string }
	| { readonly kind: typeof FailureKind.Network; readonly status?: number; readonly message: string }
	| { readonly kind: typeof FailureKind.Parse; readonly message: string }
	| {
			readonly kind: typeof FailureKind.RateLimited;
			readonly message: string;
			readonly retryAfterSeconds: number | null;
	  };

const FAILURE_KINDS: ReadonlySet<string> = new Set(Object.values(FailureKind));

export const isFailure = (value: unknown): value is Failure =>
	typeof value === "object" && value !== null && "kind" in value && FAILURE_KINDS.has(String(value.kind));

export interface InvalidInputParams {
	field: FailureField;
	message: string;
}

export const notFound = (username: Username): Failure => ({ kind: FailureKind.NotFound, username });
export const invalidInput = ({ field, message }: InvalidInputParams): Failure => ({
	kind: FailureKind.InvalidInput,
	field,
	message,
});
export interface NetworkParams {
	message: string;
	status?: number;
}

export const network = ({ message, status }: NetworkParams): Failure => ({
	kind: FailureKind.Network,
	status,
	message,
});
export const parse = (message: string): Failure => ({ kind: FailureKind.Parse, message });

export interface RateLimitedParams {
	message: string;
	retryAfterSeconds: number | null;
}

export const rateLimited = ({ message, retryAfterSeconds }: RateLimitedParams): Failure => ({
	kind: FailureKind.RateLimited,
	message,
	retryAfterSeconds,
});

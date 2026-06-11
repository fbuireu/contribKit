export const FailureKind = {
	NotFound: "NotFound",
	InvalidInput: "InvalidInput",
	Network: "Network",
	Parse: "Parse",
} as const;

export type FailureKind = (typeof FailureKind)[keyof typeof FailureKind];

export const FailureField = {
	Username: "username",
	Year: "year",
} as const;

export type FailureField = (typeof FailureField)[keyof typeof FailureField];

export type Failure =
	| { readonly kind: typeof FailureKind.NotFound; readonly username: string }
	| { readonly kind: typeof FailureKind.InvalidInput; readonly field: FailureField; readonly message: string }
	| { readonly kind: typeof FailureKind.Network; readonly status?: number; readonly message: string }
	| { readonly kind: typeof FailureKind.Parse; readonly message: string };

export const isFailure = (value: unknown): value is Failure =>
	typeof value === "object" && value !== null && "kind" in value;

export interface InvalidInputParams {
	field: FailureField;
	message: string;
}

export const notFound = (username: string): Failure => ({ kind: FailureKind.NotFound, username });
export const invalidInput = ({ field, message }: InvalidInputParams): Failure => ({
	kind: FailureKind.InvalidInput,
	field,
	message,
});
export const network = (message: string, status?: number): Failure => ({ kind: FailureKind.Network, status, message });
export const parse = (message: string): Failure => ({ kind: FailureKind.Parse, message });

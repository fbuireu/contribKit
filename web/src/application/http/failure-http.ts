import { type Failure, FailureKind } from "@domain/failures/failure";

const STATUS_BY_KIND: Record<Failure["kind"], number> = {
	[FailureKind.NotFound]: 404,
	[FailureKind.InvalidInput]: 400,
	[FailureKind.Network]: 502,
	[FailureKind.Parse]: 502,
	[FailureKind.RateLimited]: 429,
};

export const statusFor = (failure: Failure): number => STATUS_BY_KIND[failure.kind];

export const fieldFor = (failure: Failure): Record<string, string> =>
	failure.kind === FailureKind.InvalidInput ? { field: failure.field } : {};

export const messageFor = (failure: Failure): string =>
	failure.kind === FailureKind.NotFound ? "User not found" : failure.message;

export const retryAfterHeader = (failure: Failure): Record<string, string> =>
	failure.kind === FailureKind.RateLimited && failure.retryAfterSeconds !== null
		? { "Retry-After": String(failure.retryAfterSeconds) }
		: {};

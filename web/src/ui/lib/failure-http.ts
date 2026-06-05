import type { Failure } from "@domain/failures/failure";

const STATUS_BY_KIND: Record<Failure["kind"], number> = {
	NotFound: 404,
	InvalidInput: 400,
	Network: 502,
	Parse: 502,
};

export const isFailure = (value: unknown): value is Failure =>
	typeof value === "object" && value !== null && "kind" in value;

export const statusFor = (failure: Failure): number => STATUS_BY_KIND[failure.kind];

export const messageFor = (failure: Failure): string =>
	failure.kind === "NotFound" ? "User not found" : failure.message;

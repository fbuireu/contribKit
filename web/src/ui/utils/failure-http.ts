import { type Failure, FailureKind } from "@domain/failures/failure";

const STATUS_BY_KIND: Record<Failure["kind"], number> = {
	[FailureKind.NotFound]: 404,
	[FailureKind.InvalidInput]: 400,
	[FailureKind.Network]: 502,
	[FailureKind.Parse]: 502,
};

export const isFailure = (value: unknown): value is Failure =>
	typeof value === "object" && value !== null && "kind" in value;

export const statusFor = (failure: Failure): number => STATUS_BY_KIND[failure.kind];

export const messageFor = (failure: Failure): string =>
	failure.kind === FailureKind.NotFound ? "User not found" : failure.message;

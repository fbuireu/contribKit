import type { Failure } from "../../domain/failures/failure";

export const isFailure = (value: unknown): value is Failure =>
	typeof value === "object" && value !== null && "kind" in value;

export const statusFor = (failure: Failure): number => {
	switch (failure.kind) {
		case "NotFound":
			return 404;
		case "InvalidInput":
			return 400;
		case "Network":
			return 502;
		case "Parse":
			return 502;
	}
};

export const messageFor = (failure: Failure): string => {
	switch (failure.kind) {
		case "NotFound":
			return "User not found";
		case "InvalidInput":
		case "Network":
		case "Parse":
			return failure.message;
	}
};

import { type Failure, FailureField, invalidInput } from "../failures/failure";

export const GITHUB_LAUNCH_YEAR = 2005;

export interface Year {
	readonly _tag: "Year";
	readonly value: number;
}

export const parseYear = (input: number | string | null | undefined): Year | null | Failure => {
	if (input == null || input === "") return null;
	const year = typeof input === "number" ? input : Number.parseInt(input, 10);
	if (!Number.isInteger(year)) return invalidInput({ field: FailureField.Year, message: "Year must be an integer" });
	const current = new Date().getFullYear();
	if (year < GITHUB_LAUNCH_YEAR || year > current) {
		return invalidInput({
			field: FailureField.Year,
			message: `Year must be between ${GITHUB_LAUNCH_YEAR} and ${current}`,
		});
	}
	return { _tag: "Year", value: year };
};

export const isYear = (value: unknown): value is Year =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Year";

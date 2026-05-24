import { type Failure, invalidInput } from "../failures/failure";

const MIN_YEAR = 2005;

export interface Year {
	readonly _tag: "Year";
	readonly value: number;
}

export const parseYear = (input: number | string | null | undefined): Year | null | Failure => {
	if (input == null || input === "") return null;
	const parsedYear = typeof input === "number" ? input : Number.parseInt(input, 10);
	if (!Number.isInteger(parsedYear)) return invalidInput("year", "Year must be an integer");
	const current = new Date().getFullYear();
	if (parsedYear < MIN_YEAR || parsedYear > current) {
		return invalidInput("year", `Year must be between ${MIN_YEAR} and ${current}`);
	}
	return { _tag: "Year", value: parsedYear };
};

export const isYear = (value: unknown): value is Year =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Year";

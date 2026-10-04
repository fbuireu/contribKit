import { type Failure, FailureField, invalidInput } from "../failures/failure";

export const MIN_YEAR = 2005;

export interface Year {
	readonly _tag: "Year";
	readonly value: number;
}

export interface ParseYearParams {
	requested: number | string | null | undefined;
	thisYear: number;
}

export const parseYear = ({ requested, thisYear }: ParseYearParams): Year | null | Failure => {
	if (requested == null || requested === "") return null;
	const year = typeof requested === "number" ? requested : Number(requested);
	if (!Number.isInteger(year)) return invalidInput({ field: FailureField.Year, message: "Year must be an integer" });
	if (year < MIN_YEAR || year > thisYear) {
		return invalidInput({
			field: FailureField.Year,
			message: `Year must be between ${MIN_YEAR} and ${thisYear}`,
		});
	}
	return { _tag: "Year", value: year };
};

export const currentYear = (thisYear: number): Year => ({ _tag: "Year", value: thisYear });

export interface ResolveYearParams {
	requested: string | null | undefined;
	thisYear: number;
}

export const resolveYear = ({ requested, thisYear }: ResolveYearParams): number => {
	const year = Number(requested);
	return requested && Number.isInteger(year) && year >= MIN_YEAR && year <= thisYear ? year : thisYear;
};

export const isYear = (value: unknown): value is Year =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Year";

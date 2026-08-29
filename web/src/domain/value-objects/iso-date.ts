import { type Failure, FailureField, invalidInput } from "../failures/failure";

declare const isoDateBrand: unique symbol;

export type IsoDate = string & { readonly [isoDateBrand]: true };

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_START = 5;
const MONTH_END = 7;
const DAY_START = 8;
const DAY_END = 10;
const DATE_DIGITS = 2;

export const isIsoDate = (value: unknown): value is IsoDate => {
	if (typeof value !== "string") return false;
	const parts = ISO_DATE_PATTERN.exec(value);
	if (!parts) return false;
	const [, year, month, day] = parts;
	const asDate = new Date(`${value}T12:00:00`);
	return (
		asDate.getFullYear() === Number(year) && asDate.getMonth() + 1 === Number(month) && asDate.getDate() === Number(day)
	);
};

export const parseIsoDate = (raw: string): IsoDate | Failure =>
	isIsoDate(raw) ? raw : invalidInput({ field: FailureField.Date, message: `Not a calendar date: "${raw}"` });

export const isoDateOf = (date: Date): IsoDate =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(DATE_DIGITS, "0")}-${String(date.getDate()).padStart(DATE_DIGITS, "0")}` as IsoDate;

export const monthOf = (date: IsoDate): number => Number.parseInt(date.slice(MONTH_START, MONTH_END), 10);

export const dayOfMonthOf = (date: IsoDate): number => Number.parseInt(date.slice(DAY_START, DAY_END), 10);

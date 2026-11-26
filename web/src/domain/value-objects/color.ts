import { type Failure, FailureField, invalidInput } from "../failures/failure";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

declare const colorBrand: unique symbol;

export type Color = string & { readonly [colorBrand]: true };

export const isColor = (value: unknown): value is Color => typeof value === "string" && HEX_PATTERN.test(value);

export const parseColor = (raw: string): Color | Failure => {
	const trimmed = raw.trim();
	const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
	if (!isColor(hex)) {
		return invalidInput({ field: FailureField.Color, message: `Invalid hex color: "${raw}"` });
	}
	return hex;
};

export const colorOrThrow = (raw: string): Color => {
	const parsed = parseColor(raw);
	if (isColor(parsed)) return parsed;
	throw new Error(`Invalid hex color: "${raw}"`);
};

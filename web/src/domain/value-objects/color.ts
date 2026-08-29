import { type Failure, FailureField, invalidInput } from "../failures/failure";

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export interface Color {
	readonly _tag: "Color";
	readonly hex: string;
}

export const isColor = (value: unknown): value is Color =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Color";

export const parseColor = (raw: string): Color | Failure => {
	const trimmed = raw.trim();
	if (!HEX_PATTERN.test(trimmed)) {
		return invalidInput({ field: FailureField.Color, message: `Invalid hex color: "${raw}"` });
	}
	return { _tag: "Color", hex: trimmed.startsWith("#") ? trimmed : `#${trimmed}` };
};

export const colorOrThrow = (raw: string): Color => {
	const parsed = parseColor(raw);
	if (isColor(parsed)) return parsed;
	throw new Error(`Invalid hex color: "${raw}"`);
};

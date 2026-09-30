import { z } from "zod/mini";

const nonBlankText = z.string().check(z.trim(), z.minLength(1));

export const nonBlank = (raw: unknown): string | null => {
	const result = nonBlankText.safeParse(raw);
	return result.success ? result.data : null;
};

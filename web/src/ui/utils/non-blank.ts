import { z } from "astro/zod";

const nonBlankText = z.string().trim().min(1);

export const nonBlank = (raw: unknown): string | null => {
	const result = nonBlankText.safeParse(raw);
	return result.success ? result.data : null;
};

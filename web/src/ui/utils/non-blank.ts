import { z } from "astro/zod";

const nonBlankTextSchema = z.string().trim().min(1);

export const nonBlank = (raw: unknown): string | null => {
	const result = nonBlankTextSchema.safeParse(raw);
	return result.success ? result.data : null;
};

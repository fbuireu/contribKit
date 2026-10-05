import { contributionDay, isCount } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { z } from "astro/zod";

const countSchema = z.number().refine(isCount);

const contributionDaySchema = z.object({
	date: z.string(),
	level: z.number(),
	count: countSchema.nullable(),
});

type WireDay = z.input<typeof contributionDaySchema>;

export const contributionCalendarSchema = z.object({
	days: z.array(contributionDaySchema),
	total: countSchema.nullable(),
});

export const contributionCalendarErrorSchema = z.object({
	error: z.string(),
	kind: z.string().optional(),
	field: z.string().optional(),
});

export const contributionGridSchema = z.array(contributionDaySchema).min(1);

export const toContributionDays = (days: readonly WireDay[]): readonly ContributionDay[] =>
	days.map((day) => contributionDay(day)).filter((day): day is ContributionDay => !isFailure(day));

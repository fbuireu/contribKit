import { contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { z } from "astro/zod";

const count = z.int().nonnegative();

const wireDay = z.object({
	date: z.string(),
	level: z.number(),
	count: count.nullable(),
});

type WireDay = z.input<typeof wireDay>;

export const contributionsBody = z.object({
	days: z.array(wireDay),
	total: count.nullable(),
});

export const errorBody = z.object({
	error: z.string(),
});

export const injectedDays = z.array(wireDay).min(1);

export const toContributionDays = (days: readonly WireDay[]): ContributionDay[] =>
	days.map((day) => contributionDay(day)).filter((day): day is ContributionDay => !isFailure(day));

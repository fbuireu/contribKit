import { contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { z } from "zod/mini";

const count = z.int().check(z.nonnegative());

const wireDay = z.object({
	date: z.string(),
	level: z.number(),
	count: z.nullable(count),
});

type WireDay = z.input<typeof wireDay>;

export const contributionsBody = z.object({
	days: z.array(wireDay),
	total: z.nullable(count),
});

export const errorBody = z.object({
	error: z.string(),
});

export const injectedDays = z.array(wireDay).check(z.minLength(1));

export const toContributionDays = (days: readonly WireDay[]): ContributionDay[] =>
	days.map((day) => contributionDay(day)).filter((day): day is ContributionDay => !isFailure(day));

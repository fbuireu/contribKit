import type { ContributionDay } from "@domain/entities/types";
import type { Username } from "@domain/value-objects/username";

let days: readonly ContributionDay[] = [];
let username: Username | null = null;

export const getDays = (): readonly ContributionDay[] => days;
export const getUsername = (): Username | null => username;
export const setDays = (next: readonly ContributionDay[]): void => {
	days = next;
};
export const setUsername = (next: Username | null): void => {
	username = next;
};

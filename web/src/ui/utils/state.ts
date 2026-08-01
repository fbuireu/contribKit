import type { ContributionDay } from "@domain/entities/types";

let days: ContributionDay[] = [];
let username = "";

export const getDays = (): ContributionDay[] => days;
export const getUsername = (): string => username;
export const setDays = (next: ContributionDay[]): void => {
	days = next;
};
export const setUsername = (next: string): void => {
	username = next;
};

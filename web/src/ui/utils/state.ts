import type { ContributionDay } from "@domain/entities/types";

let cells: ContributionDay[] = [];
let username = "";

export const getCells = (): ContributionDay[] => cells;
export const getUsername = (): string => username;
export const setCells = (next: ContributionDay[]): void => {
	cells = next;
};
export const setUsername = (next: string): void => {
	username = next;
};

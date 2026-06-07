import type { Cell } from "@ui/components/grid/calendar-utils";

let cells: Cell[] = [];
let username = "";

export const getCells = (): Cell[] => cells;
export const getUsername = (): string => username;
export const setCells = (next: Cell[]): void => {
	cells = next;
};
export const setUsername = (next: string): void => {
	username = next;
};

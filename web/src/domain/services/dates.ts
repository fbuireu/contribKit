export const WEEKS_PER_YEAR = 53;
export const DAYS_PER_WEEK = 7;
export const GRID_CELL_COUNT = WEEKS_PER_YEAR * DAYS_PER_WEEK;
const ISO_DATE_LENGTH = "YYYY-MM-DD".length;

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, ISO_DATE_LENGTH);

export interface AddDaysParams {
	iso: string;
	days: number;
}

export const addDays = ({ iso, days }: AddDaysParams): string => {
	const date = new Date(`${iso}T12:00:00`);
	date.setDate(date.getDate() + days);
	return toIsoDate(date);
};

export const getWeekday = (iso: string): number => new Date(`${iso}T12:00:00`).getDay();

export const chunkWeeks = <T>(cells: readonly T[]): T[][] =>
	Array.from({ length: WEEKS_PER_YEAR }, (_, weekIndex) =>
		cells.slice(weekIndex * DAYS_PER_WEEK, (weekIndex + 1) * DAYS_PER_WEEK),
	);

export const WEEKS_PER_YEAR = 53;
export const DAYS_PER_WEEK = 7;
export const GRID_CELL_COUNT = WEEKS_PER_YEAR * DAYS_PER_WEEK;
const MONTH_DIGITS = 2;
const DAY_DIGITS = 2;

export const toIsoDate = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(MONTH_DIGITS, "0")}-${String(date.getDate()).padStart(DAY_DIGITS, "0")}`;

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

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const DAYS_IN_LEAP_YEAR = 366;
const DAYS_IN_COMMON_YEAR = 365;

export const leadingDaysFor = (year: number): number => getWeekday(`${year}-01-01`);

export const weeksFor = (year: number): number =>
	Math.ceil((leadingDaysFor(year) + (isLeapYear(year) ? DAYS_IN_LEAP_YEAR : DAYS_IN_COMMON_YEAR)) / DAYS_PER_WEEK);

export const chunkWeeks = <T>(days: readonly T[]): T[][] =>
	Array.from({ length: Math.ceil(days.length / DAYS_PER_WEEK) }, (_, weekIndex) =>
		days.slice(weekIndex * DAYS_PER_WEEK, (weekIndex + 1) * DAYS_PER_WEEK),
	);

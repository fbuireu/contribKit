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

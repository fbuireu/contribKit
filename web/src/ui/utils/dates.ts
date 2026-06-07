export function addDays(iso: string, days: number): string {
	const date = new Date(`${iso}T12:00:00`);
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

export function getWeekday(iso: string): number {
	return new Date(`${iso}T12:00:00`).getDay();
}

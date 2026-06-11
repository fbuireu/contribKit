export function readUsernameFromUrl(fallback: string): string {
	return new URLSearchParams(globalThis.location.search).get("user")?.trim() || fallback;
}

export function readYearFromUrl(currentYear: number): number {
	const year = Number(new URLSearchParams(globalThis.location.search).get("year"));
	return year && year <= currentYear ? year : currentYear;
}

export interface SyncUrlParams {
	username: string;
	year: number;
	currentYear: number;
}

export function syncUrl({ username, year, currentYear }: SyncUrlParams): void {
	const url = new URL(globalThis.location.href);
	if (username) url.searchParams.set("user", username);
	else url.searchParams.delete("user");
	if (year && year !== currentYear) url.searchParams.set("year", String(year));
	else url.searchParams.delete("year");
	if (url.href !== globalThis.location.href) globalThis.history.pushState(null, "", url);
}

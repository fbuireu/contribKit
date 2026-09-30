import { MIN_YEAR } from "@domain/value-objects/year";
import { z } from "astro/zod";
import { nonBlank } from "./non-blank";

const queryParam = (name: string): string | null => new URLSearchParams(globalThis.location.search).get(name);

export const readRequestedUsername = (): string | null => nonBlank(queryParam("user"));

export function readUsernameFromUrl(fallback: string): string {
	return readRequestedUsername() ?? fallback;
}

export function readYearFromUrl(currentYear: number): number {
	const year = z.coerce.number().pipe(z.int().min(MIN_YEAR).max(currentYear)).safeParse(queryParam("year"));
	return year.success ? year.data : currentYear;
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

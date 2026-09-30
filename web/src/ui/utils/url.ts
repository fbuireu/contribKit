import { MIN_YEAR } from "@domain/value-objects/year";
import { z } from "zod/mini";
import { nonBlank } from "./non-blank";

const queryParam = (name: string): string | null => new URLSearchParams(globalThis.location.search).get(name);

export const readRequestedUsername = (): string | null => nonBlank(queryParam("user"));

export function readUsernameFromUrl(fallback: string): string {
	return readRequestedUsername() ?? fallback;
}

export function readYearFromUrl(currentYear: number): number {
	const year = z
		.pipe(z.coerce.number(), z.int().check(z.minimum(MIN_YEAR), z.maximum(currentYear)))
		.safeParse(queryParam("year"));
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

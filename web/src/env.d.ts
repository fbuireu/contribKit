/// <reference types="astro/client" />

import type { ContributionDay } from "./domain/entities/contribution-day";

declare global {
	interface Window {
		__INITIAL_CELLS__?: ContributionDay[];
		__INITIAL_USERNAME__?: string;
	}
}

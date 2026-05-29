/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GA_ID?: string;
	readonly PUBLIC_BS_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

import type { ContributionDay } from "./domain/entities/contribution-day";

declare global {
	interface Window {
		__INITIAL_CELLS__?: ContributionDay[];
		__INITIAL_USERNAME__?: string;
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

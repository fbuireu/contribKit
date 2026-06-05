/// <reference types="astro/client" />
import type { ContributionDay } from "@domain/entities/contribution-day";

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
	readonly PUBLIC_BETTER_STACK_SOURCE_TOKEN: string;
	readonly PUBLIC_BETTER_STACK_INGESTING_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	interface Window {
		__INITIAL_CELLS__?: ContributionDay[];
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

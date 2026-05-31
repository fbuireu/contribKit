/// <reference types="astro/client" />
import type { ContributionDay } from "@domain/entities/contribution-day";

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
	readonly PUBLIC_BETTER_STACK_TOKEN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	interface Window {
		__INITIAL_CELLS__?: ContributionDay[];
		__INITIAL_USERNAME__?: string;
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

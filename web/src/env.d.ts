/// <reference types="astro/client" />
import type { ContributionDay } from "@domain/entities/types";

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
	readonly PUBLIC_BETTER_STACK_SOURCE_TOKEN: string;
	readonly PUBLIC_BETTER_STACK_INGESTING_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	const __APP_VERSION__: string;
	interface Window {
		__INITIAL_CELLS__?: ContributionDay[];
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

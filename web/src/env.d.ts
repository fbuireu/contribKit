/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
	readonly PUBLIC_BETTER_STACK_TRACKING_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	const __APP_VERSION__: string;
	const __WEB_VERSION__: string;
	interface Window {
		__INITIAL_DAYS__?: unknown;
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
		betterstack?: (command: string, ...args: unknown[]) => void;
	}
}

export {};

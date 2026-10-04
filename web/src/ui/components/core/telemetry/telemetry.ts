import { acceptedService } from "vanilla-cookieconsent";
import { ConsentCategory, ConsentService } from "../cookie-consent/config";

interface Telemetry {
	syncGoogleConsent(granted: boolean): void;
	loadGoogleAnalytics(): void;
	loadBetterStack(): void;
}

export const BETTER_STACK_TAG_ORIGIN = "https://betterstack.net";

export const GoogleConsentState = {
	Granted: "granted",
	Denied: "denied",
} as const;

const DEVELOPMENT_HOSTS = ["localhost", "127.0.0.1"];

export const TelemetryEnvironment = {
	Production: "production",
	Development: "development",
} as const;

export type TelemetryEnvironment = (typeof TelemetryEnvironment)[keyof typeof TelemetryEnvironment];

export const telemetryEnvironmentFor = (hostname: string): TelemetryEnvironment =>
	DEVELOPMENT_HOSTS.includes(hostname) || hostname.endsWith(".workers.dev")
		? TelemetryEnvironment.Development
		: TelemetryEnvironment.Production;

const appendScript = (src: string): void => {
	const script = document.createElement("script");
	script.async = true;
	script.crossOrigin = "anonymous";
	script.src = src;
	document.head.appendChild(script);
};

const queueCallsUntilTheTagLoads = (): void => {
	if (window.betterstack) return;
	const queued: unknown[][] = [];
	const stub = (...args: unknown[]): void => {
		queued.push(args);
	};
	stub.q = queued;
	window.betterstack = stub;
};

function createTelemetry(): Telemetry {
	let googleAnalyticsLoaded = false;
	let betterStackLoaded = false;

	return {
		syncGoogleConsent(granted) {
			window.gtag?.("consent", "update", {
				analytics_storage: granted ? GoogleConsentState.Granted : GoogleConsentState.Denied,
			});
		},
		loadGoogleAnalytics() {
			const id = import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID;
			if (!id || googleAnalyticsLoaded) return;
			googleAnalyticsLoaded = true;
			appendScript(`https://www.googletagmanager.com/gtag/js?id=${id}`);
		},
		loadBetterStack() {
			const token = import.meta.env.PUBLIC_BETTER_STACK_TRACKING_TOKEN;
			if (!token || betterStackLoaded) return;
			betterStackLoaded = true;

			queueCallsUntilTheTagLoads();
			appendScript(`${BETTER_STACK_TAG_ORIGIN}/b.js?t=${encodeURIComponent(token)}`);
			window.betterstack?.("init", { environment: telemetryEnvironmentFor(window.location.hostname) });
		},
	};
}

let instance: Telemetry | null = null;

export const getTelemetry = (): Telemetry => (instance ??= createTelemetry());

const applyConsent = (): void => {
	const telemetry = getTelemetry();
	const googleGranted = acceptedService(ConsentService.GoogleAnalytics, ConsentCategory.Analytics);
	telemetry.syncGoogleConsent(googleGranted);
	if (googleGranted) telemetry.loadGoogleAnalytics();
	if (acceptedService(ConsentService.BetterStack, ConsentCategory.Analytics)) telemetry.loadBetterStack();
};

export function initTelemetry(): void {
	applyConsent();
	window.addEventListener("cc:onConsent", applyConsent);
	window.addEventListener("cc:onChange", applyConsent);
}

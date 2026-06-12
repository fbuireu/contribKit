interface Analytics {
	syncGoogleConsent(granted: boolean): void;
	loadGoogleAnalytics(): void;
	loadBetterStack(): void;
}

interface AppendScriptParams {
	src: string;
	token?: string;
}

function appendScript({ src, token }: AppendScriptParams): void {
	const script = document.createElement("script");
	script.async = true;
	script.src = src;
	if (token) script.dataset.token = token;
	document.head.appendChild(script);
}

function createAnalytics(): Analytics {
	let googleAnalyticsLoaded = false;
	let betterStackLoaded = false;

	return {
		syncGoogleConsent(granted) {
			window.gtag?.("consent", "update", {
				analytics_storage: granted ? "granted" : "denied",
			});
		},
		loadGoogleAnalytics() {
			const id = import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID;
			if (!id || googleAnalyticsLoaded) return;
			googleAnalyticsLoaded = true;
			appendScript({ src: `https://www.googletagmanager.com/gtag/js?id=${id}` });
		},
		loadBetterStack() {
			const token = import.meta.env.PUBLIC_BETTER_STACK_SOURCE_TOKEN;
			if (!token || betterStackLoaded) return;
			betterStackLoaded = true;
			appendScript({ src: "https://cdn.betterstack.com/js/telemetry.js", token });
		},
	};
}

let instance: Analytics | null = null;

export const getAnalytics = (): Analytics => (instance ??= createAnalytics());

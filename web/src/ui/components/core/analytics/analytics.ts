interface Analytics {
	syncGoogleConsent(granted: boolean): void;
	loadGoogleAnalytics(): void;
	loadBetterStack(): void;
}

function appendScript(src: string): HTMLScriptElement {
	const script = document.createElement("script");
	script.async = true;
	script.src = src;
	document.head.appendChild(script);
	return script;
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
			appendScript(`https://www.googletagmanager.com/gtag/js?id=${id}`);
		},
		loadBetterStack() {
			const token = import.meta.env.PUBLIC_BETTER_STACK_SOURCE_TOKEN;
			if (!token || betterStackLoaded) return;
			betterStackLoaded = true;
			const script = appendScript("https://cdn.betterstack.com/js/telemetry.js");
			script.dataset.token = token;
		},
	};
}

let instance: Analytics | null = null;

export const getAnalytics = (): Analytics => (instance ??= createAnalytics());

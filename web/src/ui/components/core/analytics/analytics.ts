interface Analytics {
	syncGoogleConsent(granted: boolean): void;
	loadBetterStack(): void;
}

function createAnalytics(): Analytics {
	let betterStackLoaded = false;

	return {
		syncGoogleConsent(granted) {
			window.gtag?.("consent", "update", {
				analytics_storage: granted ? "granted" : "denied",
			});
		},
		loadBetterStack() {
			const token = import.meta.env.PUBLIC_BETTER_STACK_SOURCE_TOKEN;
			if (!token || betterStackLoaded) return;
			betterStackLoaded = true;
			const script = document.createElement("script");
			script.async = true;
			script.src = "https://cdn.betterstack.com/js/telemetry.js";
			script.dataset.token = token;
			document.head.appendChild(script);
		},
	};
}

let instance: Analytics | null = null;

export const getAnalytics = (): Analytics => (instance ??= createAnalytics());

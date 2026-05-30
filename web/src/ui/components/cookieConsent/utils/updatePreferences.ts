import { acceptedService } from "vanilla-cookieconsent";

let betterStackLoaded = false;

function loadBetterStack(): void {
	const token = import.meta.env.PUBLIC_BS_TOKEN as string | undefined;
	if (!token || betterStackLoaded) return;
	betterStackLoaded = true;
	const s = document.createElement("script");
	s.async = true;
	s.src = "https://cdn.betterstack.com/js/telemetry.js";
	s.setAttribute("data-token", token);
	document.head.appendChild(s);
}

export function updatePreferences(): void {
	window.gtag?.("consent", "update", {
		analytics_storage: acceptedService("ga4", "analytics") ? "granted" : "denied",
	});

	if (acceptedService("betterstack", "analytics")) {
		loadBetterStack();
	}
}

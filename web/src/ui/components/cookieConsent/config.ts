import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { acceptedCategory } from "vanilla-cookieconsent";
import { updatePreferences } from "./utils/updatePreferences";

export const config: CookieConsentConfig = {
	onConsent: () => updatePreferences(),
	onChange: ({ changedCategories, changedServices }) => {
		const analyticsChanged = changedCategories.includes("analytics") || Object.hasOwn(changedServices, "analytics");
		if (!analyticsChanged) return;
		updatePreferences();
		if (!acceptedCategory("analytics")) globalThis.location.reload();
	},

	guiOptions: {
		consentModal: {
			layout: "bar",
			position: "bottom center",
			equalWeightButtons: false,
			flipButtons: false,
		},
		preferencesModal: {
			layout: "box",
			equalWeightButtons: false,
			flipButtons: false,
		},
	},

	categories: {
		necessary: {
			enabled: true,
			readOnly: true,
		},
		analytics: {
			autoClear: {
				cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: /^bs_/ }],
			},
			services: {
				ga4: {
					label:
						'<a href="https://marketingplatform.google.com/about/analytics/terms/us/" target="_blank">Google Analytics 4</a>',
					cookies: [{ name: /^(_ga|_gid)/ }],
				},
				betterstack: {
					label: '<a href="https://betterstack.com/privacy" target="_blank">Better Stack Telemetry</a>',
					cookies: [{ name: /^bs_/ }],
				},
			},
		},
	},

	language: {
		default: "en",
		translations: {
			en: {
				consentModal: {
					title: "We use cookies",
					description:
						"We use analytics and performance-monitoring tools to understand how visitors use ContribKit. You can manage your choices anytime. No personal data is sold or shared.",
					acceptAllBtn: "Accept all",
					acceptNecessaryBtn: "Reject all",
					showPreferencesBtn: "Manage",
				},
				preferencesModal: {
					title: "Privacy preferences",
					acceptAllBtn: "Accept all",
					acceptNecessaryBtn: "Reject all",
					savePreferencesBtn: "Save preferences",
					closeIconLabel: "Close",
					serviceCounterLabel: "Service|Services",
					sections: [
						{
							title: "Cookie usage",
							description:
								"We use cookies to keep the site functional and to measure usage. Select which categories you allow. Your choice is stored in this browser for 6 months.",
						},
						{
							title: "Strictly necessary",
							description: "Required for the site to work. These cannot be disabled.",
							linkedCategory: "necessary",
							cookieTable: {
								headers: {
									name: "Cookie",
									service: "Service",
									description: "Purpose",
									expiration: "Expires",
								},
								body: [
									{
										name: "cc_cookie",
										service: "ContribKit",
										description: "Stores your cookie consent preferences.",
										expiration: "6 months",
									},
								],
							},
						},
						{
							title: "Analytics",
							description: "Help us understand traffic and usage patterns. All data is anonymous and never sold.",
							linkedCategory: "analytics",
							cookieTable: {
								headers: {
									name: "Cookie",
									service: "Service",
									description: "Purpose",
									expiration: "Expires",
								},
								body: [
									{
										name: "_ga",
										service: "Google Analytics",
										description: "Distinguishes unique visitors.",
										expiration: "2 years",
									},
									{
										name: "_ga_*",
										service: "Google Analytics",
										description: "Persists session state.",
										expiration: "2 years",
									},
									{
										name: "bs_*",
										service: "Better Stack",
										description: "Session telemetry.",
										expiration: "Session",
									},
								],
							},
						},
					],
				},
			},
		},
	},
};

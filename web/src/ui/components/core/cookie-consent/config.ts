import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { acceptedCategory } from "vanilla-cookieconsent";
import { USERNAME_COOKIE } from "../../../utils/cookie";

export const CONSENT_COOKIE_NAME = "cc_cookie";

export const ConsentCategory = {
	Necessary: "necessary",
	Analytics: "analytics",
} as const;

export const ConsentService = {
	GoogleAnalytics: "ga4",
	BetterStack: "betterstack",
} as const;

const GOOGLE_ANALYTICS_COOKIES = /^_ga/;
const GOOGLE_ANALYTICS_LEGACY_COOKIES = /^(_ga|_gid)/;
const BETTER_STACK_COOKIES = /^bs_/;

export const config: CookieConsentConfig = {
	cookie: {
		name: CONSENT_COOKIE_NAME,
	},

	onChange: ({ changedCategories, changedServices }) => {
		const analyticsChanged =
			changedCategories.includes(ConsentCategory.Analytics) ||
			Object.hasOwn(changedServices, ConsentCategory.Analytics);
		if (!analyticsChanged) return;
		if (!acceptedCategory(ConsentCategory.Analytics)) globalThis.location.reload();
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
		[ConsentCategory.Necessary]: {
			enabled: true,
			readOnly: true,
		},
		[ConsentCategory.Analytics]: {
			autoClear: {
				cookies: [{ name: GOOGLE_ANALYTICS_COOKIES }, { name: "_gid" }, { name: BETTER_STACK_COOKIES }],
			},
			services: {
				[ConsentService.GoogleAnalytics]: {
					label:
						'<a href="https://marketingplatform.google.com/about/analytics/terms/us/" target="_blank">Google Analytics 4</a>',
					cookies: [{ name: GOOGLE_ANALYTICS_LEGACY_COOKIES }],
				},
				[ConsentService.BetterStack]: {
					label: '<a href="https://betterstack.com/privacy" target="_blank">Better Stack Telemetry</a>',
					cookies: [{ name: BETTER_STACK_COOKIES }],
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
							linkedCategory: ConsentCategory.Necessary,
							cookieTable: {
								headers: {
									name: "Cookie",
									service: "Service",
									description: "Purpose",
									expiration: "Expires",
								},
								body: [
									{
										name: CONSENT_COOKIE_NAME,
										service: "ContribKit",
										description: "Stores your cookie consent preferences.",
										expiration: "6 months",
									},
									{
										name: USERNAME_COOKIE,
										service: "ContribKit",
										description: "Remembers the last GitHub username you viewed.",
										expiration: "1 week",
									},
								],
							},
						},
						{
							title: "Analytics",
							description: "Help us understand traffic and usage patterns. All data is anonymous and never sold.",
							linkedCategory: ConsentCategory.Analytics,
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

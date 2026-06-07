import { readFileSync } from "node:fs";
import path from "node:path";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField, fontProviders } from "astro/config";

const NOINDEX_SLUGS = ["legal-notice", "privacy", "terms"];

const APP_VERSION =
	readFileSync(new URL("../app/pubspec.yaml", import.meta.url), "utf8").match(/^version:\s*([\d.]+)/m)?.[1] ?? "0.0.0";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	integrations: [
		sitemap({
			customPages: ["https://contribkit.app/"],
			filter: (page) => !NOINDEX_SLUGS.some((slug) => page.includes(slug)),
		}),
	],
	trailingSlash: "never",
	site: "https://contribkit.app",
	prefetch: {
		prefetchAll: true,
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-inter",
			weights: ["400", "500", "600", "700"],
			display: "swap",
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-jetbrains-mono",
			weights: ["400", "500", "600"],
			display: "swap",
		},
	],
	env: {
		schema: {
			PUBLIC_GOOGLE_ANALYTICS_ID: envField.string({ context: "client", access: "public" }),
			PUBLIC_BETTER_STACK_SOURCE_TOKEN: envField.string({ context: "client", access: "public" }),
			PUBLIC_BETTER_STACK_INGESTING_URL: envField.string({ context: "client", access: "public" }),
		},
	},
	vite: {
		define: {
			__APP_VERSION__: JSON.stringify(APP_VERSION),
		},
		build: {
			target: "esnext",
		},
		resolve: {
			alias: {
				"@shared": path.resolve("../shared"),
			},
		},
		server: {
			fs: {
				allow: [".."],
			},
		},
	},
});

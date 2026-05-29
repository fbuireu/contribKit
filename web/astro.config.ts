import path from "node:path";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig, envField, fontProviders } from "astro/config";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
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
			weights: ["400", "500", "600", "700", "800"],
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
			PUBLIC_GA_ID: envField.string({ context: "client", access: "public", optional: true }),
			PUBLIC_BS_TOKEN: envField.string({ context: "client", access: "public", optional: true }),
		},
	},
	vite: {
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

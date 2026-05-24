import path from "node:path";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	trailingSlash: "never",
	site: "https://contribkit.app",
	prefetch: {
		prefetchAll: true,
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

import { defineConfig, devices } from "@playwright/test";

const LOCAL_URL = "http://localhost:8787";
const BASE_URL = process.env.BASE_URL ?? LOCAL_URL;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? "50%" : undefined,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
		extraHTTPHeaders: ((): Record<string, string> => {
			const id = process.env.CF_ACCESS_CLIENT_ID;
			const secret = process.env.CF_ACCESS_CLIENT_SECRET;
			if (!id && !secret) return {};
			if (!id || !secret) {
				throw new Error(
					`CF Access misconfigured: ${!id ? "CF_ACCESS_CLIENT_ID" : "CF_ACCESS_CLIENT_SECRET"} is missing`,
				);
			}
			return { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret };
		})(),
	},
	webServer: process.env.BASE_URL
		? undefined
		: { command: "pnpm wrangler:dev", url: LOCAL_URL, reuseExistingServer: true, timeout: 180_000 },
	projects: process.env.CI
		? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
		: [
				{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
				{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
				{ name: "webkit", use: { ...devices["Desktop Safari"] } },
			],
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:4321",
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
	projects: process.env.CI
		? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
		: [
				{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
				{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
				{ name: "webkit", use: { ...devices["Desktop Safari"] } },
			],
});
